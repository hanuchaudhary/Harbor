import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { createNotifications } from "@/lib/actions/notification";

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
        assignees: { select: { userId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

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

      await logActivity(tx, {
        userId: session.user.id,
        action: "TASK_ASSIGNED",
        projectId: task.projectId,
        taskId,
        metadata: { description: `Updated assignees for '${task.title}'` },
      });

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
