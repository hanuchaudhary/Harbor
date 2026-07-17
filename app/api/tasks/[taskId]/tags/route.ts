import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";

type Params = { params: Promise<{ taskId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { taskId } = await params;
    const body = await request.json();
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { message: "tagIds must be an array" },
        { status: 400 },
      );
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        title: true,
        projectId: true,
      },
    });

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskTag.deleteMany({
        where: { taskId },
      });

      if (tagIds.length > 0) {
        await tx.taskTag.createMany({
          data: tagIds.map((tagId: string) => ({
            taskId,
            tagId,
          })),
        });
      }

      await logActivity(tx, {
        userId: session.user.id,
        action: "TASK_UPDATED",
        projectId: task.projectId,
        taskId,
        metadata: { description: `Updated tags for '${task.title}'` },
      });
    });

    return NextResponse.json({ message: "Tags updated" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
