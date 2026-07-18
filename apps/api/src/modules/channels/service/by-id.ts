import { ZodError } from "zod";

import { auth } from "../../../lib/auth";
import { prisma } from "@repo/db";
import { updateChannelSchema } from "../model";

export async function GET(request: Request, params: Record<string, string>) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { channelId } = params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
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
            messages: {
              where: {
                deletedAt: null,
              },
            },
            members: true,
          },
        },
      },
    });

    if (!channel) {
      return Response.json({ message: "Channel not found" },
        { status: 404 },
      );
    }

    return Response.json({ channel });
  } catch (error) {
    console.error("Error fetching channel:", error);
    return Response.json(
      { message: "Failed to fetch channel" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, params: Record<string, string>) {
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

    const { channelId } = params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return Response.json({ message: "Channel not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validatedData = updateChannelSchema.parse(body);

    const updatedChannel = await prisma.channel.update({
      where: { id: channelId },
      data: validatedData,
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
            members: true,
          },
        },
      },
    });

    return Response.json({ channel: updatedChannel });
  } catch (error: unknown) {
    console.error("Error updating channel:", error);

    if (error instanceof ZodError) {
      return Response.json(
        { message: "Validation error", errors: error.issues },
        { status: 400 },
      );
    }

    return Response.json(
      { message: "Failed to update channel" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, params: Record<string, string>) {
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

    const { channelId } = params;

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return Response.json(
        { message: "Channel not found" },
        { status: 404 },
      );
    }

    await prisma.channel.update({
      where: { id: channelId },
      data: { isActive: false },
    });

    return Response.json({ message: "Channel deleted successfully" });
  } catch (error) {
    console.error("Error deleting channel:", error);
    return Response.json(
      { message: "Failed to delete channel" },
      { status: 500 },
    );
  }
}
