import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { ChannelType } from "@/generated/prisma/enums";
import { createMessageSchema } from "@/validations/validation";

async function canAccessChannel(userId: string, channelId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      type: true,
      projectId: true,
    },
  });

  if (!channel) {
    return { canAccess: false, error: "Channel not found" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      projectMembers: {
        where: { projectId: channel.projectId || undefined },
        select: { projectId: true },
      },
      projectClients: {
        where: { projectId: channel.projectId || undefined },
        select: { projectId: true },
      },
    },
  });

  if (!user) {
    return { canAccess: false, error: "User not found" };
  }

  const isAdmin = user.role === "ADMIN";
  const isPM = user.role === "PROJECT_MANAGER";
  const isDev = user.role === "DEVELOPER";
  const isClient = user.role === "CLIENT";

  if (isAdmin) {
    return { canAccess: true, channel, user };
  }

  const hasProjectAccess =
    user.projectMembers.length > 0 || user.projectClients.length > 0;

  switch (channel.type) {
    case ChannelType.ALL:
      return { canAccess: true, channel, user };

    case ChannelType.PROJECT_MANAGERS:
      return { canAccess: isPM, channel, user };

    case ChannelType.PROJECT_DEV_PM:
      // PMs can access all project channels, devs only their projects
      return { canAccess: isPM || (isDev && hasProjectAccess), channel, user };

    case ChannelType.PROJECT_CLIENT_PM:
      // PMs can access all project channels, clients only their projects
      return {
        canAccess: isPM || (isClient && hasProjectAccess),
        channel,
        user,
      };

    case ChannelType.PROJECT_CLIENT_ADMIN:
      return { canAccess: isClient && hasProjectAccess, channel, user };

    case ChannelType.ANNOUNCEMENT:
      return { canAccess: true, channel, user };

    default:
      return { canAccess: false, error: "Invalid channel type" };
  }
}

async function canWriteToChannel(userId: string, channelId: string) {
  const accessCheck = await canAccessChannel(userId, channelId);

  if (!accessCheck.canAccess) {
    return accessCheck;
  }

  const { channel, user } = accessCheck;

  if (channel?.type === ChannelType.ANNOUNCEMENT && user?.role !== "ADMIN") {
    return { canAccess: false, error: "Only admins can post announcements" };
  }

  return accessCheck;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { channelId } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before") || "";
    const after = searchParams.get("after") || "";

    const accessCheck = await canAccessChannel(session.user.id, channelId);

    if (!accessCheck.canAccess) {
      return NextResponse.json(
        { message: accessCheck.error || "Access denied" },
        { status: 403 },
      );
    }

    const where: any = {
      channelId,
      deletedAt: null,
    };

    if (before) {
      where.createdAt = { lt: new Date(before) };
    } else if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    const skip = before || after ? 0 : (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        select: {
          id: true,
          channelId: true,
          userId: true,
          content: true,
          mediaUrls: true,
          isEdited: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          mentions: {
            where: {
              mentionedId: session.user.id,
            },
            select: {
              id: true,
              mentionedId: true,
              isRead: true,
            },
          },
        },
        orderBy: { createdAt: before ? "desc" : "asc" },
        take: limit,
        skip,
      }),
      prisma.message.count({ where }),
    ]);

    if (before) {
      messages.reverse();
    }

    return NextResponse.json({
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { message: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { channelId } = await params;
    const accessCheck = await canWriteToChannel(session.user.id, channelId);
    if (!accessCheck.canAccess) {
      return NextResponse.json(
        { message: accessCheck.error || "Access denied" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { data, error } = createMessageSchema.safeParse({
      ...body,
      channelId,
    });
    if (error) {
      return NextResponse.json(
        { message: "Validation error", errors: error.issues[0].message },
        { status: 400 },
      );
    }

    const { content, mediaUrls, replyToId, mentions } = data;

    const channel = accessCheck.channel!;

    const message = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          content: content || "",
          mediaUrls: mediaUrls || [],
          channelId,
          userId: session.user.id,
          replyToId: replyToId || null,
        },
        select: {
          id: true,
          channelId: true,
          userId: true,
          content: true,
          mediaUrls: true,
          isEdited: true,
          replyToId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
      });

      if (mentions && mentions.length > 0) {
        if (mentions.includes("@all")) {
          let usersToMention: { id: string }[] = [];

          if (
            channel.type === ChannelType.ALL ||
            channel.type === ChannelType.ANNOUNCEMENT
          ) {
            usersToMention = await tx.user.findMany({
              where: { deletedAt: null },
              select: { id: true },
            });
          } else if (channel.projectId) {
            const [projectMembers, projectClients] = await Promise.all([
              tx.projectMember.findMany({
                where: { projectId: channel.projectId },
                select: { userId: true },
              }),
              tx.projectClient.findMany({
                where: { projectId: channel.projectId },
                select: { userId: true },
              }),
            ]);
            const userIds = new Set([
              ...projectMembers.map((m) => m.userId),
              ...projectClients.map((c) => c.userId),
            ]);
            usersToMention = Array.from(userIds).map((id) => ({ id }));
          }

          if (usersToMention.length > 0) {
            await tx.messageMention.createMany({
              data: usersToMention.map((user) => ({
                messageId: newMessage.id,
                mentionedId: user.id,
              })),
            });
          }
        } else {
          await tx.messageMention.createMany({
            data: mentions.map((mentionedId) => ({
              messageId: newMessage.id,
              mentionedId,
            })),
          });
        }
      }
      return newMessage;
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating message:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Failed to create message" },
      { status: 500 },
    );
  }
}
