import { auth } from "../../../lib/auth";
import { prisma } from "@repo/db";

export async function PATCH(request: Request, params: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = params;

  try {
    await prisma.messageMention.updateMany({
      where: {
        mentionedId: session.user.id,
        isRead: false,
        message: { channelId },
      },
      data: { isRead: true },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error marking channel mentions as read:", error);
    return Response.json(
      { message: "Failed to mark mentions as read" },
      { status: 500 },
    );
  }
}
