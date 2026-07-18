import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import { S3Fncs } from "@/lib/s3/s3.func";
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

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ attachments });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch attachments" },
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
  const body = await request.json();
  const { name, fileUrl, fileType, fileSize } = body;

  if (!name || !fileUrl || !fileType || fileSize == null) {
    return NextResponse.json(
      { message: "name, fileUrl, fileType and fileSize are required" },
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

  const attachment = await prisma.$transaction(async (tx) => {
    const created = await tx.attachment.create({
      data: {
        taskId,
        name,
        fileUrl,
        fileType,
        fileSize: Number(fileSize),
      },
    });

    await logActivity(tx, {
      userId: session.user.id,
      action: "ATTACHMENT_ADDED",
      projectId: task.projectId,
      taskId,
      metadata: {
        description: ActivityParser.attachment.added(name, task.title),
      },
    });

    const notifyIds = task.assignees
      .map((a) => a.userId)
      .filter((id) => id !== session.user.id);
    await createNotifications(tx, notifyIds, {
      title: "New attachment",
      body: `An attachment '${name}' was added to '${task.title}'`,
      link: `/tracker/${taskId}`,
    });

    return created;
  });

  return NextResponse.json({ attachment }, { status: 201 });
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
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json(
      { message: "attachmentId is required" },
      { status: 400 },
    );
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, taskId },
    include: {
      task: {
        select: {
          title: true,
          projectId: true,
          assignees: { select: { userId: true } },
        },
      },
    },
  });

  if (!attachment) {
    return NextResponse.json(
      { message: "Attachment not found" },
      { status: 404 },
    );
  }

  try {
    const publicBase = process.env.S3_PUBLIC_URL ?? "";
    if (publicBase && attachment.fileUrl.startsWith(publicBase)) {
      const key = attachment.fileUrl.replace(`${publicBase}/`, "");
      await S3Fncs.deleteFile(key);
    }
  } catch {}

  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id: attachmentId } });

    await logActivity(tx, {
      userId: session.user.id,
      action: "ATTACHMENT_DELETED",
      projectId: attachment.task.projectId,
      taskId,
      metadata: {
        description: ActivityParser.attachment.deleted(
          attachment.name,
          attachment.task.title,
        ),
      },
    });

    const notifyIds = attachment.task.assignees
      .map((a) => a.userId)
      .filter((id) => id !== session.user.id);
    await createNotifications(tx, notifyIds, {
      title: "Attachment removed",
      body: `Attachment '${attachment.name}' was removed from '${attachment.task.title}'`,
    });
  });

  return NextResponse.json({ message: "Attachment deleted" });
}
