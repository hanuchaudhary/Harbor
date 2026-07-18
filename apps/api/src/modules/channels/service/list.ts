import { ZodError } from "zod";

import { auth } from "../../../lib/auth";
import { prisma } from "@repo/db";
import { Prisma } from "@repo/db/client";
import { ChannelType } from "@repo/db/enums";
import { createChannelSchema } from "../model";

const PROJECT_CHANNEL_TYPES: ChannelType[] = [
  ChannelType.PROJECT_DEV_PM,
  ChannelType.PROJECT_CLIENT_PM,
  ChannelType.PROJECT_CLIENT_ADMIN,
];

export async function GET(request: Request, _params: Record<string, string> = {}) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "";

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        projectMembers: {
          select: { projectId: true },
        },
        projectClients: {
          select: { projectId: true },
        },
      },
    });

    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    const isAdmin = user.role === "ADMIN";
    const isPM = user.role === "PROJECT_MANAGER";
    const isDev = user.role === "DEVELOPER";
    const isClient = user.role === "CLIENT";

    const userProjectIds = [
      ...user.projectMembers.map((m) => m.projectId),
      ...user.projectClients.map((c) => c.projectId),
    ];

    const where: Prisma.ChannelWhereInput = {
      isActive: true,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (!isAdmin) {
      const orConditions: Prisma.ChannelWhereInput[] = [];

      orConditions.push({ type: ChannelType.ALL });

      if (isPM) {
        // Project Managers can see all project channels
        orConditions.push({ type: ChannelType.PROJECT_MANAGERS });
        orConditions.push({ type: ChannelType.PROJECT_DEV_PM });
        orConditions.push({ type: ChannelType.PROJECT_CLIENT_PM });
      }

      if (isDev) {
        orConditions.push({
          type: ChannelType.PROJECT_DEV_PM,
          projectId: { in: userProjectIds },
        });
      }

      if (isClient) {
        orConditions.push({
          type: ChannelType.PROJECT_CLIENT_PM,
          projectId: { in: userProjectIds },
        });
        orConditions.push({
          type: ChannelType.PROJECT_CLIENT_ADMIN,
          projectId: { in: userProjectIds },
        });
      }

      orConditions.push({ type: ChannelType.ANNOUNCEMENT });

      where.OR = orConditions;
    }

    const channels = await prisma.channel.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        projectId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const channelIds = channels.map((c) => c.id);
    const unreadMentions = await prisma.messageMention.findMany({
      where: {
        mentionedId: user.id,
        isRead: false,
        message: { channelId: { in: channelIds } },
      },
      select: { message: { select: { channelId: true } } },
    });

    const mentionCountMap: Record<string, number> = {};
    for (const m of unreadMentions) {
      const cid = m.message.channelId;
      mentionCountMap[cid] = (mentionCountMap[cid] || 0) + 1;
    }

    const channelsWithCount = channels.map((c) => ({
      ...c,
      unreadCount: mentionCountMap[c.id] || 0,
    }));

    return Response.json({ channels: channelsWithCount });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return Response.json(
      { message: "Failed to fetch channels" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, _params: Record<string, string> = {}) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createChannelSchema.parse(body);

    if (
      PROJECT_CHANNEL_TYPES.includes(validatedData.type as ChannelType) &&
      !validatedData.projectId
    ) {
      return Response.json({ message: "A project is required for this channel type" },
        { status: 400 },
      );
    }

    if (validatedData.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: validatedData.projectId },
      });

      if (!project) {
        return Response.json(
          { message: "Project not found" },
          { status: 404 },
        );
      }
    }

    const channel = await prisma.channel.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type as ChannelType,
        projectId: validatedData.projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return Response.json({ channel }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating channel:", error);

    if (error instanceof ZodError) {
      return Response.json(
        { message: "Validation error", errors: error.issues },
        { status: 400 },
      );
    }

    return Response.json(
      { message: "Failed to create channel" },
      { status: 500 },
    );
  }
}
