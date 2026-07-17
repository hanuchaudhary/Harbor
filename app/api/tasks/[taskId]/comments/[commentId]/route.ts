import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;

  try {
    const { body } = await request.json();
    if (!body?.trim()) {
      return NextResponse.json(
        { message: "Body is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.comment.findFirst({
      where: { id: commentId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 },
      );
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { body: body.trim(), isEdited: true },
      select: {
        id: true,
        body: true,
        isEdited: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return NextResponse.json({ comment });
  } catch {
    return NextResponse.json(
      { message: "Failed to edit comment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { commentId } = await params;

  try {
    const existing = await prisma.comment.findFirst({
      where: { id: commentId, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 },
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ message: "Comment deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete comment" },
      { status: 500 },
    );
  }
}
