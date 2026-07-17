import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { createNotifications } from "@/lib/actions/notification";
import { ActivityParser } from "@/lib/activity/activity-parser";

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
    });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const dependencies = await prisma.taskDependency.findMany({
      where: { taskId },
      select: {
        id: true,
        dependsOnTaskId: true,
        createdAt: true,
        dependsOnTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const dependents = await prisma.taskDependency.findMany({
      where: { dependsOnTaskId: taskId },
      select: {
        id: true,
        taskId: true,
        createdAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ dependencies, dependents }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch dependencies:", error);
    return NextResponse.json(
      { message: "Failed to fetch dependencies" },
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
    const { dependsOnTaskId } = await request.json();
    if (!dependsOnTaskId) {
      return NextResponse.json(
        { message: "dependsOnTaskId is required" },
        { status: 400 },
      );
    }

    if (taskId === dependsOnTaskId) {
      return NextResponse.json(
        { message: "A task cannot depend on itself" },
        { status: 400 },
      );
    }

    // Check if both tasks exist and belong to the same project
    const [task, dependsOnTask] = await Promise.all([
      prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
          id: true,
          title: true,
          projectId: true,
          project: { select: { slug: true } },
          assignees: { select: { userId: true } },
        },
      }),
      prisma.task.findFirst({
        where: { id: dependsOnTaskId, deletedAt: null },
        select: {
          id: true,
          title: true,
          projectId: true,
          status: true,
        },
      }),
    ]);

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    if (!dependsOnTask) {
      return NextResponse.json(
        { message: "Dependency task not found" },
        { status: 404 },
      );
    }

    if (task.projectId !== dependsOnTask.projectId) {
      return NextResponse.json(
        { message: "Tasks must be in the same project" },
        { status: 400 },
      );
    }

    // Check if dependency already exists
    const existingDep = await prisma.taskDependency.findFirst({
      where: { taskId, dependsOnTaskId },
    });
    if (existingDep) {
      return NextResponse.json(
        { message: "Dependency already exists" },
        { status: 400 },
      );
    }

    // Check for circular dependencies
    const wouldCreateCircular = await checkCircularDependency(
      dependsOnTaskId,
      taskId,
    );
    if (wouldCreateCircular) {
      return NextResponse.json(
        { message: "This would create a circular dependency" },
        { status: 400 },
      );
    }

    const dependency = await prisma.$transaction(async (tx) => {
      const created = await tx.taskDependency.create({
        data: { taskId, dependsOnTaskId },
        select: {
          id: true,
          dependsOnTaskId: true,
          createdAt: true,
          dependsOnTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              completedAt: true,
            },
          },
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "TASK_DEPENDENCY_ADDED",
        projectId: task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.task.dependencyAdded(
            task.title,
            dependsOnTask.title,
          ),
        },
      });

      const notifyIds = task.assignees
        .map((a) => a.userId)
        .filter((id) => id !== session.user.id);
      await createNotifications(tx, notifyIds, {
        title: "Task dependency added",
        body: `'${task.title}' now depends on '${dependsOnTask.title}'`,
        link: `/tracker/${taskId}`,
      });

      return created;
    });

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    console.error("Failed to create dependency:", error);
    return NextResponse.json(
      { message: "Failed to create dependency" },
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
  const { searchParams } = new URL(request.url);
  const dependencyId = searchParams.get("dependencyId");

  if (!dependencyId) {
    return NextResponse.json(
      { message: "dependencyId is required" },
      { status: 400 },
    );
  }

  try {
    const dependency = await prisma.taskDependency.findUnique({
      where: { id: dependencyId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
            assignees: { select: { userId: true } },
          },
        },
        dependsOnTask: {
          select: { id: true, title: true },
        },
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { message: "Dependency not found" },
        { status: 404 },
      );
    }

    if (dependency.taskId !== taskId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskDependency.delete({ where: { id: dependencyId } });

      await logActivity(tx, {
        userId: session.user.id,
        action: "TASK_DEPENDENCY_REMOVED",
        projectId: dependency.task.projectId,
        taskId,
        metadata: {
          description: ActivityParser.task.dependencyRemoved(
            dependency.task.title,
            dependency.dependsOnTask.title,
          ),
        },
      });

      const notifyIds = dependency.task.assignees
        .map((a) => a.userId)
        .filter((id) => id !== session.user.id);
      await createNotifications(tx, notifyIds, {
        title: "Task dependency removed",
        body: `Dependency removed from '${dependency.task.title}'`,
        link: `/tracker/${taskId}`,
      });
    });

    return NextResponse.json(
      { message: "Dependency removed" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to remove dependency" },
      { status: 500 },
    );
  }
}

// Helper function to check for circular dependencies
async function checkCircularDependency(
  startTaskId: string,
  targetTaskId: string,
): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [startTaskId];

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;

    if (visited.has(currentTaskId)) {
      continue;
    }

    if (currentTaskId === targetTaskId) {
      return true;
    }

    visited.add(currentTaskId);

    const dependencies = await prisma.taskDependency.findMany({
      where: { taskId: currentTaskId },
      select: { dependsOnTaskId: true },
    });

    for (const dep of dependencies) {
      if (!visited.has(dep.dependsOnTaskId)) {
        queue.push(dep.dependsOnTaskId);
      }
    }
  }

  return false;
}
