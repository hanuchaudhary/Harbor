import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; subtaskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId, subtaskId } = await params;

  try {
    const { title, isDone, deadline } = await request.json();

    const existing = await prisma.subtask.findFirst({
      where: { id: subtaskId, taskId },
      include: {
        task: { select: { title: true, projectId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ message: "Subtask not found" }, { status: 404 });
    }

    const subtask = await prisma.$transaction(async (tx) => {
      const updated = await tx.subtask.update({
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
      const changes = {
        ...(title !== undefined &&
          existing.title !== updated.title && {
            title: { from: existing.title, to: updated.title },
          }),
        ...(isDone !== undefined &&
          existing.isDone !== updated.isDone && {
            isDone: { from: existing.isDone, to: updated.isDone },
          }),
        ...(deadline !== undefined && {
          deadline: { from: existing.deadline, to: updated.deadline },
        }),
      };
      const action =
        existing.isDone !== updated.isDone
          ? updated.isDone
            ? "SUBTASK_COMPLETED"
            : "SUBTASK_REOPENED"
          : "SUBTASK_UPDATED";

      await logActivity(tx, {
        userId: session.user.id,
        action,
        projectId: existing.task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.subtask.updated(updated.title, changes),
          entity: { type: "subtask", id: subtaskId, name: updated.title },
          context: { taskId, taskTitle: existing.task.title },
          changes: Object.entries(changes).map(([field, value]) => ({
            field,
            from:
              value.from instanceof Date
                ? value.from.toISOString()
                : value.from,
            to: value.to instanceof Date ? value.to.toISOString() : value.to,
          })),
        },
      });

      return updated;
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

  const { taskId, subtaskId } = await params;

  try {
    const existing = await prisma.subtask.findFirst({
      where: { id: subtaskId, taskId },
      include: {
        task: { select: { title: true, projectId: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ message: "Subtask not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.subtask.delete({ where: { id: subtaskId } });
      await logActivity(tx, {
        userId: session.user.id,
        action: "SUBTASK_DELETED",
        projectId: existing.task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.subtask.deleted(
            existing.title,
            existing.task.title,
          ),
          entity: { type: "subtask", id: subtaskId, name: existing.title },
          context: { taskId, taskTitle: existing.task.title },
        },
      });
    });
    return NextResponse.json({ message: "Subtask deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete subtask" },
      { status: 500 },
    );
  }
}
