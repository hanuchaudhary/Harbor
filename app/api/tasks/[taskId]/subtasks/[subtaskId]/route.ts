import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { subtaskId } = await params;

  try {
    const { title, isDone, deadline } = await request.json();

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(isDone !== undefined && { isDone: Boolean(isDone) }),
        ...(deadline !== undefined && {
          deadline: deadline ? new Date(deadline) : null,
        }),
      },
      select: {
        id: true,
        title: true,
        isDone: true,
        deadline: true,
        order: true,
      },
    });

    return NextResponse.json({ subtask });
  } catch {
    return NextResponse.json(
      { message: "Failed to update subtask" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { subtaskId } = await params;

  try {
    await prisma.subtask.delete({ where: { id: subtaskId } });
    return NextResponse.json({ message: "Subtask deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete subtask" },
      { status: 500 },
    );
  }
}
