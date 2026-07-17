import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { createNotifications } from "@/lib/actions/notification";
import { ActivityParser } from "@/lib/activity/activity-parser";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
      select: {
        id: true,
        title: true,
        isDone: true,
        deadline: true,
        order: true,
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ subtasks });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch subtasks" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const { title } = await request.json();
    if (!title?.trim()) {
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 },
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { slug: true } },
        assignees: { select: { userId: true } },
      },
    });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const count = await prisma.subtask.count({ where: { taskId } });

    const subtask = await prisma.$transaction(async (tx) => {
      const created = await tx.subtask.create({
        data: { taskId, title: title.trim(), order: count },
        select: {
          id: true,
          title: true,
          isDone: true,
          deadline: true,
          order: true,
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "SUBTASK_CREATED",
        projectId: task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.subtask.added(created.title, task.title),
        },
      });

      const notifyIds = task.assignees
        .map((a) => a.userId)
        .filter((id) => id !== session.user.id);
      await createNotifications(tx, notifyIds, {
        title: "New subtask",
        body: `A subtask '${created.title}' was added to '${task.title}'`,
        link: `/tracker/${taskId}`,
      });

      return created;
    });

    return NextResponse.json({ subtask }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Failed to create subtask" },
      { status: 500 },
    );
  }
}
