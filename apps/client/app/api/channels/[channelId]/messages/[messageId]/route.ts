import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import { updateMessageSchema } from "@/validations/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { channelId, messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId, channelId },
    });

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 },
      );
    }

    if (message.userId !== session.user.id) {
      return NextResponse.json(
        { message: "You can only edit your own messages" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateMessageSchema.parse(body);

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: validatedData.content,
        isEdited: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        mentions: {
          select: {
            id: true,
            mentionedId: true,
            isRead: true,
          },
        },
      },
    });

    return NextResponse.json({ message: updatedMessage });
  } catch (error: any) {
    console.error("Error updating message:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Failed to update message" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { channelId, messageId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const message = await prisma.message.findUnique({
      where: { id: messageId, channelId },
    });

    if (!message) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 },
      );
    }

    if (message.userId !== session.user.id && user?.role !== "ADMIN") {
      return NextResponse.json(
        { message: "You can only delete your own messages" },
        { status: 403 },
      );
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { message: "Failed to delete message" },
      { status: 500 },
    );
  }
}
