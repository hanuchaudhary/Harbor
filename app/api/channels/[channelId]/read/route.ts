import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;

  try {
    await prisma.messageMention.updateMany({
      where: {
        mentionedId: session.user.id,
        isRead: false,
        message: { channelId },
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking channel mentions as read:", error);
    return NextResponse.json(
      { message: "Failed to mark mentions as read" },
      { status: 500 },
    );
  }
}
