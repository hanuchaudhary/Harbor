import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
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
        tags: { select: { tagId: true, tag: { select: { name: true } } } },
      },
    });

    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const previousIds = new Set(task.tags.map(({ tagId }) => tagId));
    const nextIds = new Set(tagIds as string[]);
    const addedIds = [...nextIds].filter((id) => !previousIds.has(id));
    const removedIds = [...previousIds].filter((id) => !nextIds.has(id));
    const addedTags = await prisma.tag.findMany({
      where: { id: { in: addedIds } },
      select: { id: true, name: true },
    });
    const previousNames = new Map(
      task.tags.map(({ tagId, tag }) => [tagId, tag.name]),
    );
    const removedTags = removedIds.map((id) => ({
      id,
      name: previousNames.get(id) ?? "Unknown tag",
    }));

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

      for (const tag of addedTags) {
        await logActivity(tx, {
          userId: session.user.id,
          action: "TAG_ADDED_TO_TASK",
          projectId: task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.task.tagsUpdated(
              task.title,
              [tag.name],
              [],
            ),
            entity: { type: "task", id: taskId, name: task.title },
            target: { type: "tag", id: tag.id, name: tag.name },
            context: { taskId, taskTitle: task.title },
          },
        });
      }

      for (const tag of removedTags) {
        await logActivity(tx, {
          userId: session.user.id,
          action: "TAG_REMOVED_FROM_TASK",
          projectId: task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.task.tagsUpdated(
              task.title,
              [],
              [tag.name],
            ),
            entity: { type: "task", id: taskId, name: task.title },
            target: { type: "tag", id: tag.id, name: tag.name },
            context: { taskId, taskTitle: task.title },
          },
        });
      }
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
