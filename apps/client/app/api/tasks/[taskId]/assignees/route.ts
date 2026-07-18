import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import { logActivity } from "@/lib/actions/activity";
import { createNotifications } from "@/lib/actions/notification";
import { ActivityParser } from "@/lib/activity/activity-parser";

type Params = { params: Promise<{ taskId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId } = await params;
    const body = await request.json();
    const { assigneeIds } = body;

    if (!Array.isArray(assigneeIds)) {
      return NextResponse.json(
        { message: "assigneeIds must be an array" },
        { status: 400 },
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        title: true,
        projectId: true,
        assignees: {
          select: { userId: true, user: { select: { name: true } } },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const previousIds = new Set(task.assignees.map(({ userId }) => userId));
    const nextIds = new Set(assigneeIds as string[]);
    const addedIds = [...nextIds].filter((id) => !previousIds.has(id));
    const removedIds = [...previousIds].filter((id) => !nextIds.has(id));
    const addedUsers = await prisma.user.findMany({
      where: { id: { in: addedIds } },
      select: { id: true, name: true },
    });
    const previousNames = new Map(
      task.assignees.map(({ userId, user }) => [userId, user.name]),
    );
    const addedNames = addedUsers.map(({ name }) => name);
    const removedNames = removedIds.map(
      (id) => previousNames.get(id) ?? "Unknown user",
    );

    await prisma.$transaction(async (tx) => {
      await tx.taskAssignee.deleteMany({
        where: { taskId },
      });

      if (assigneeIds.length > 0) {
        await tx.taskAssignee.createMany({
          data: assigneeIds.map((userId: string) => ({
            taskId,
            userId,
          })),
        });
      }

      if (addedIds.length > 0 || removedIds.length > 0) {
        await logActivity(tx, {
          userId: session.user.id,
          action: addedIds.length > 0 ? "TASK_ASSIGNED" : "TASK_UNASSIGNED",
          projectId: task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.task.assigneesUpdated(
              task.title,
              addedNames,
              removedNames,
            ),
            entity: { type: "task", id: taskId, name: task.title },
            context: { taskId, taskTitle: task.title },
            changes: [
              {
                field: "assignees",
                from: removedNames.join(", ") || null,
                to: addedNames.join(", ") || null,
              },
            ],
          },
        });
      }

      const notifyIds = assigneeIds.filter(
        (id: string) => id !== session.user.id,
      );
      if (notifyIds.length > 0) {
        await createNotifications(tx, notifyIds, {
          title: "Task assigned",
          body: `You have been assigned to '${task.title}'`,
          link: `/tracker/${taskId}`,
        });
      }
    });

    return NextResponse.json({ message: "Assignees updated" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
