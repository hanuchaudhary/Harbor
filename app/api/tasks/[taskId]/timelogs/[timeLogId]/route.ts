import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";

const timeLogSelect = {
  id: true,
  taskId: true,
  userId: true,
  type: true,
  duration: true,
  startedAt: true,
  endedAt: true,
  note: true,
  isRunning: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, image: true } },
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; timeLogId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId, timeLogId } = await params;

  try {
    const body = await request.json();
    const { duration, note, type } = body;

    const existing = await prisma.timeLog.findFirst({
      where: { id: timeLogId, taskId, userId: session.user.id },
      select: {
        id: true,
        duration: true,
        note: true,
        type: true,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Time log not found" },
        { status: 404 },
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true, title: true },
    });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const updated = await prisma.timeLog.update({
      where: { id: timeLogId },
      data: {
        ...(typeof duration === "number" && { duration }),
        ...(note !== undefined && { note: note?.trim() || null }),
        ...(type && { type }),
        editedAt: new Date(),
        editedById: session.user.id,
      },
      select: timeLogSelect,
    });

    const changes: {
      duration?: { from: number; to: number };
      note?: { from: string | null; to: string | null };
      type?: { from: string; to: string };
    } = {};

    if (typeof duration === "number" && duration !== existing.duration) {
      changes.duration = { from: existing.duration, to: duration };
    }
    if (note !== undefined && note !== existing.note) {
      changes.note = { from: existing.note, to: note?.trim() || null };
    }
    if (type && type !== existing.type) {
      changes.type = { from: existing.type, to: type };
    }

    await logActivity(null as any, {
      userId: session.user.id,
      action: "TIMELOG_UPDATED",
      projectId: task.projectId,
      taskId,
      metadata: {
        description: ActivityParser.timeLog.updated(task.title, changes),
        taskTitle: task.title,
      },
    });

    const timeLog = updated;

    return NextResponse.json({ timeLog });
  } catch {
    return NextResponse.json(
      { message: "Failed to update time log" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string; timeLogId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId, timeLogId } = await params;

  try {
    const existing = await prisma.timeLog.findFirst({
      where: { id: timeLogId, taskId, userId: session.user.id },
      select: { id: true, duration: true },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Time log not found" },
        { status: 404 },
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true, title: true },
    });

    await prisma.timeLog.delete({ where: { id: timeLogId } });

    if (task) {
      await logActivity(null as any, {
        userId: session.user.id,
        action: "TIMELOG_DELETED",
        projectId: task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.timeLog.deleted(
            task.title,
            existing.duration,
          ),
          taskTitle: task.title,
        },
      });
    }

    return NextResponse.json({ message: "Time log deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete time log" },
      { status: 500 },
    );
  }
}
