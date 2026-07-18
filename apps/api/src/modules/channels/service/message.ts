import { auth } from "../../../lib/auth";
import { prisma } from "@repo/db";
import { updateMessageSchema } from "../model";

export async function PATCH(request: Request, params: Record<string, string>) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { channelId, messageId } = params;

    const message = await prisma.message.findUnique({
      where: { id: messageId, channelId },
    });

    if (!message) {
      return Response.json({ message: "Message not found" },
        { status: 404 },
      );
    }

    if (message.userId !== session.user.id) {
      return Response.json(
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

    return Response.json({ message: updatedMessage });
  } catch (error: any) {
    console.error("Error updating message:", error);

    if (error.name === "ZodError") {
      return Response.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 },
      );
    }

    return Response.json(
      { message: "Failed to update message" },
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
    const { channelId, messageId } = params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const message = await prisma.message.findUnique({
      where: { id: messageId, channelId },
    });

    if (!message) {
      return Response.json(
        { message: "Message not found" },
        { status: 404 },
      );
    }

    if (message.userId !== session.user.id && user?.role !== "ADMIN") {
      return Response.json(
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

    return Response.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    return Response.json(
      { message: "Failed to delete message" },
      { status: 500 },
    );
  }
}
