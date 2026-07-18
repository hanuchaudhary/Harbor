import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import {
  TaskStatus as TaskStatusEnum,
  Priority as PriorityEnum,
} from "@repo/db/enums";
import { logActivity } from "@/lib/actions/activity";
import { createNotifications } from "@/lib/actions/notification";
import { ActivityParser } from "@/lib/activity/activity-parser";
import { getStatusLevel } from "@/lib/constants";

const validStatuses = Object.values(TaskStatusEnum);
const validPriorities = Object.values(PriorityEnum);

const isTaskStatus = (v: string): v is (typeof validStatuses)[number] =>
  validStatuses.includes(v as (typeof validStatuses)[number]);

const isPriority = (v: string): v is (typeof validPriorities)[number] =>
  validPriorities.includes(v as (typeof validPriorities)[number]);

export async function GET(
  request: NextRequest,
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
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdById: true,
        startDate: true,
        endDate: true,
        completedAt: true,
        progressPct: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        repoId: true,
        project: {
          select: { id: true, name: true, slug: true },
        },
        repo: {
          select: { id: true, name: true, url: true },
        },
        assignees: {
          select: {
            id: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        tags: {
          select: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
        _count: {
          select: {
            subtasks: true,
            dependencies: true,
            dependents: true,
            comments: true,
            attachments: true,
            timeLogs: true,
            history: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      task,
      counts: {
        subtasks: task._count.subtasks,
        dependencies: task._count.dependencies,
        dependents: task._count.dependents,
        comments: task._count.comments,
        attachments: task._count.attachments,
        timeLogs: task._count.timeLogs,
        history: task._count.history,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch task" },
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
    const {
      title,
      description,
      status,
      priority,
      startDate,
      endDate,
      progressPct,
      repoId,
    } = body;

    const existing = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const prevStatus = existing.status;
    const nextStatus = status && isTaskStatus(status) ? status : undefined;

    if (nextStatus && nextStatus !== prevStatus) {
      const dependencies = await prisma.taskDependency.findMany({
        where: { taskId },
        include: {
          dependsOnTask: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      const nextLevel = getStatusLevel(nextStatus);
      for (const dep of dependencies) {
        const depLevel = getStatusLevel(dep.dependsOnTask.status);
        if (nextLevel > depLevel) {
          return NextResponse.json(
            {
              message: `Cannot update status: task depends on "${dep.dependsOnTask.title}" which has a lower status`,
            },
            { status: 400 },
          );
        }
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && {
            description: description || null,
          }),
          ...(nextStatus && { status: nextStatus }),
          ...(priority && isPriority(priority) && { priority }),
          ...(startDate !== undefined && {
            startDate: startDate ? new Date(startDate) : null,
          }),
          ...(endDate !== undefined && {
            endDate: endDate ? new Date(endDate) : null,
          }),
          ...(progressPct !== undefined && {
            progressPct: Math.max(0, Math.min(100, Number(progressPct))),
          }),
          ...(repoId !== undefined && {
            repoId: repoId || null,
          }),
          ...(nextStatus === TaskStatusEnum.COMPLETED && {
            completedAt: new Date(),
          }),
          ...(nextStatus &&
            nextStatus !== TaskStatusEnum.COMPLETED && { completedAt: null }),
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          createdById: true,
          startDate: true,
          endDate: true,
          completedAt: true,
          progressPct: true,
          order: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          repoId: true,
          project: {
            select: { id: true, name: true, slug: true },
          },
          repo: {
            select: { id: true, name: true, url: true },
          },
          assignees: {
            select: {
              id: true,
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          tags: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
        },
      });

      if (nextStatus && nextStatus !== prevStatus) {
        await tx.taskStatusHistory.create({
          data: {
            taskId,
            from: prevStatus,
            to: nextStatus,
            changedBy: session.user.id,
          },
        });
      }

      const activityAction =
        nextStatus === TaskStatusEnum.COMPLETED && nextStatus !== prevStatus
          ? "TASK_COMPLETED"
          : prevStatus === TaskStatusEnum.COMPLETED &&
              nextStatus &&
              nextStatus !== prevStatus
            ? "TASK_REOPENED"
          : nextStatus && nextStatus !== prevStatus
            ? "TASK_STATUS_CHANGED"
            : priority !== undefined
              ? "TASK_PRIORITY_CHANGED"
              : endDate !== undefined
                ? "TASK_DEADLINE_CHANGED"
                : description !== undefined
                  ? "TASK_DESCRIPTION_UPDATED"
                  : "TASK_UPDATED";

      const changes = {
        ...(title !== undefined &&
          existing.title !== updated.title && {
            title: { from: existing.title, to: updated.title },
          }),
        ...(description !== undefined &&
          existing.description !== updated.description && {
            description: {
              from: existing.description,
              to: updated.description,
            },
          }),
        ...(nextStatus &&
          existing.status !== updated.status && {
            status: { from: existing.status, to: updated.status },
          }),
        ...(priority !== undefined &&
          existing.priority !== updated.priority && {
            priority: { from: existing.priority, to: updated.priority },
          }),
        ...(startDate !== undefined && {
          startDate: { from: existing.startDate, to: updated.startDate },
        }),
        ...(endDate !== undefined && {
          endDate: { from: existing.endDate, to: updated.endDate },
        }),
        ...(progressPct !== undefined &&
          existing.progressPct !== updated.progressPct && {
            progressPct: {
              from: existing.progressPct,
              to: updated.progressPct,
            },
          }),
      };

      await logActivity(tx, {
        userId: session.user.id,
        action: activityAction,
        projectId: existing.projectId,
        taskId,
        metadata: {
          description: ActivityParser.task.updated(updated.title, changes),
          entity: { type: "task", id: taskId, name: updated.title },
          context: {
            projectId: updated.project.id,
            projectName: updated.project.name,
            projectSlug: updated.project.slug,
            taskId,
            taskTitle: updated.title,
          },
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

      const notifyIds = updated.assignees
        .map((a) => a.user.id)
        .filter((id) => id !== session.user.id);
      await createNotifications(tx, notifyIds, {
        title: "Task updated",
        body: `Task '${updated.title}' has been updated`,
        link: `/tracker/${taskId}`,
      });

      return updated;
    });

    return NextResponse.json({ task });
  } catch(e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
        project: { select: { slug: true } },
        assignees: { select: { userId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });

      await tx.taskDependency.deleteMany({
        where: { OR: [{ taskId }, { dependsOnTaskId: taskId }] },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "TASK_DELETED",
        projectId: existing.projectId,
        taskId,
        metadata: { description: ActivityParser.task.deleted(existing.title) },
      });

      const notifyIds = existing.assignees
        .map((a) => a.userId)
        .filter((id) => id !== session.user.id);
      await createNotifications(tx, notifyIds, {
        title: "Task deleted",
        body: `Task '${existing.title}' has been deleted`,
      });
    });

    return NextResponse.json({ message: "Task deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete task" },
      { status: 500 },
    );
  }
}
