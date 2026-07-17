import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";
import { TimeLogType } from "@/generated/prisma/enums";
import { TIMER_HEARTBEAT_STALE_AFTER_MS } from "@/lib/timer";

const timeLogSelect = {
  id: true,
  taskId: true,
  userId: true,
  type: true,
  duration: true,
  startedAt: true,
  endedAt: true,
  lastHeartbeatAt: true,
  note: true,
  isRunning: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, image: true } },
};

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

    const timeLogs = await prisma.timeLog.findMany({
      where: { taskId },
      select: timeLogSelect,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ timeLogs });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch time logs" },
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
    const body = await request.json();
    const { duration, type, note, startedAt } = body;

    if (!type || !["MANUAL", "AUTO"].includes(type)) {
      return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true, title: true },
    });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    if (type === "MANUAL") {
      if (!duration || typeof duration !== "number" || duration <= 0) {
        return NextResponse.json(
          { message: "Invalid duration" },
          { status: 400 },
        );
      }

      const timeLog = await prisma.timeLog.create({
        data: {
          taskId,
          userId: session.user.id,
          type: type as TimeLogType,
          duration,
          note: note?.trim() || null,
          startedAt: startedAt ? new Date(startedAt) : null,
          isRunning: false,
        },
        select: timeLogSelect,
      });

      await logActivity(undefined, {
        userId: session.user.id,
        action: "TIMELOG_ADDED",
        projectId: task.projectId,
        taskId,
        metadata: {
          version: 1,
          description: ActivityParser.timeLog.added(task.title, duration, type),
          duration,
          type,
          taskTitle: task.title,
        },
      });

      return NextResponse.json({ timeLog }, { status: 201 });
    }

    if (type === "AUTO") {
      const existing = await prisma.timeLog.findFirst({
        where: { taskId, userId: session.user.id, isRunning: true },
      });
      if (existing) {
        return NextResponse.json(
          { message: "A timer is already running for this task" },
          { status: 409 },
        );
      }

      const now = new Date();
      const timeLog = await prisma.timeLog.create({
        data: {
          taskId,
          userId: session.user.id,
          type: type as TimeLogType,
          duration: 0,
          note: note?.trim() || null,
          startedAt: now,
          lastHeartbeatAt: now,
          isRunning: true,
        },
        select: timeLogSelect,
      });

      await logActivity(undefined, {
        userId: session.user.id,
        action: "TIMELOG_STARTED",
        projectId: task.projectId,
        taskId,
        metadata: {
          version: 1,
          description: ActivityParser.timeLog.started(task.title, type),
          type,
          taskTitle: task.title,
        },
      });

      return NextResponse.json({ timeLog }, { status: 201 });
    }

    return NextResponse.json({ message: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Failed to create time log" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const body = await request.json();
    const { timeLogId } = body;

    if (!timeLogId) {
      return NextResponse.json(
        { message: "timeLogId is required" },
        { status: 400 },
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true, title: true },
    });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const running = await prisma.timeLog.findFirst({
        where: {
          id: timeLogId,
          taskId,
          userId: session.user.id,
          isRunning: true,
        },
      });
      if (!running) {
        return NextResponse.json(
          { message: "No running timer found" },
          { status: 404 },
        );
      }

      const now = new Date();
      const checkpoint = running.lastHeartbeatAt ?? running.startedAt;
      const elapsedMs = checkpoint
        ? now.getTime() - checkpoint.getTime()
        : TIMER_HEARTBEAT_STALE_AFTER_MS + 1;
      const elapsed =
        elapsedMs >= 0 && elapsedMs <= TIMER_HEARTBEAT_STALE_AFTER_MS
          ? Math.floor(elapsedMs / 1000)
          : 0;
      const totalDuration = running.duration + elapsed;

      const result = await prisma.timeLog.updateMany({
        where: {
          id: running.id,
          isRunning: true,
          duration: running.duration,
          lastHeartbeatAt: running.lastHeartbeatAt,
        },
        data: {
          isRunning: false,
          endedAt: now,
          duration: totalDuration,
        },
      });
      if (result.count === 0) continue;

      const timeLog = await prisma.timeLog.findUnique({
        where: { id: running.id },
        select: timeLogSelect,
      });

      await logActivity(undefined, {
        userId: session.user.id,
        action: "TIMELOG_STOPPED",
        projectId: task.projectId,
        taskId,
        metadata: {
          version: 1,
          description: ActivityParser.timeLog.stopped(
            task.title,
            totalDuration,
          ),
          duration: totalDuration,
          taskTitle: task.title,
        },
      });

      return NextResponse.json({ timeLog });
    }

    return NextResponse.json(
      { message: "Timer changed while it was being stopped; please retry" },
      { status: 409 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Failed to stop timer" },
      { status: 500 },
    );
  }
}
