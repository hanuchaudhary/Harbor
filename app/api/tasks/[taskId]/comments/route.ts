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

    const comments = await prisma.comment.findMany({
      where: { taskId },
      select: {
        id: true,
        body: true,
        isEdited: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch comments" },
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
    const { body, mentionIds = [] } = await request.json();
    if (!body?.trim()) {
      return NextResponse.json(
        { message: "Body is required" },
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

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: { taskId, userId: session.user.id, body: body.trim() },
        select: {
          id: true,
          body: true,
          isEdited: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      if (Array.isArray(mentionIds) && mentionIds.length > 0) {
        await tx.mention.createMany({
          data: mentionIds.map((mentionedId: string) => ({
            commentId: created.id,
            mentionedId,
          })),
          skipDuplicates: true,
        });
      }

      await logActivity(tx, {
        userId: session.user.id,
        action: "COMMENT_ADDED",
        projectId: task.projectId,
        taskId,
        metadata: { description: ActivityParser.comment.added(task.title) },
      });

      const notifyIds = task.assignees
        .map((a) => a.userId)
        .filter((id) => id !== session.user.id);
      await createNotifications(tx, notifyIds, {
        title: "New comment",
        body: `${session.user.name} commented on '${task.title}'`,
        link: `/tracker/${taskId}`,
      });

      return created;
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Failed to add comment" },
      { status: 500 },
    );
  }
}
