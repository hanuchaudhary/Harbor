import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId, commentId } = await params;

  try {
    const { body } = await request.json();
    if (!body?.trim()) {
      return NextResponse.json(
        { message: "Body is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.comment.findFirst({
      where: { id: commentId, taskId, userId: session.user.id },
      include: {
        task: { select: { title: true, projectId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 },
      );
    }

    const comment = await prisma.$transaction(async (tx) => {
      const updated = await tx.comment.update({
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

      await logActivity(tx, {
        userId: session.user.id,
        action: "COMMENT_EDITED",
        projectId: existing.task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.comment.updated(existing.task.title),
          entity: { type: "comment", id: commentId },
          context: { taskId, taskTitle: existing.task.title },
        },
      });

      return updated;
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

  const { taskId, commentId } = await params;

  try {
    const existing = await prisma.comment.findFirst({
      where: { id: commentId, taskId, userId: session.user.id },
      include: {
        task: { select: { title: true, projectId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: commentId } });
      await logActivity(tx, {
        userId: session.user.id,
        action: "COMMENT_DELETED",
        projectId: existing.task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.comment.deleted(existing.task.title),
          entity: { type: "comment", id: commentId },
          context: { taskId, taskTitle: existing.task.title },
        },
      });
    });
    return NextResponse.json({ message: "Comment deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete comment" },
      { status: 500 },
    );
  }
}
