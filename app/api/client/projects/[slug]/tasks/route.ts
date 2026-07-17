import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { TaskStatus as TaskStatusEnum } from "@/generated/prisma/enums";

type Params = { params: Promise<{ slug: string }> };
const COMPLETED_TASK_RETENTION_DAYS = 14;

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "CLIENT") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { slug } = await params;

    const project = await prisma.project.findUnique({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        clients: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    if (project.clients.length === 0) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const completedRetentionCutoff = new Date(
      Date.now() - COMPLETED_TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const tasks = await prisma.task.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
        NOT: {
          status: TaskStatusEnum.COMPLETED,
          completedAt: { lt: completedRetentionCutoff },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdById: true,
        status: true,
        priority: true,
        startDate: true,
        endDate: true,
        completedAt: true,
        progressPct: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
        repoId: true,
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
            tag: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        dependencies: {
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
        },
        timeLogs: {
          select: { duration: true },
        },
      },
      orderBy: [{ status: "asc" }, { order: "asc" }],
    });

    const mappedTasks = tasks.map((task) => ({
      ...task,
      project: { id: project.id, name: project.name, slug: project.slug },
      repo: null,
      subtasks: [],
      comments: [],
      attachments: [],
      history: [],
      dependents: [],
      totalTime: task.timeLogs.reduce(
        (acc, log) => acc + (log.duration ?? 0),
        0,
      ),
      timeLogs: [],
    }));

    return NextResponse.json({ tasks: mappedTasks }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
