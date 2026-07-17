import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

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
        description: true,
        brand: true,
        status: true,
        progressPct: true,
        startDate: true,
        estimatedEndAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        clients: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        milestones: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
          orderBy: { startDate: "asc" },
        },
        members: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
            priority: true,
            progressPct: true,
            timeLogs: {
              select: { duration: true },
            },
          },
        },
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
            milestones: { where: { deletedAt: null } },
          },
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

    const totalTimeSeconds = project.tasks.reduce(
      (acc, task) =>
        acc + task.timeLogs.reduce((s, log) => s + (log.duration ?? 0), 0),
      0,
    );

    const taskStatusMap: Record<string, number> = {};
    for (const task of project.tasks) {
      taskStatusMap[task.status] = (taskStatusMap[task.status] ?? 0) + 1;
    }

    const completedTasks = taskStatusMap["COMPLETED"] ?? 0;
    const totalTasks = project.tasks.length;
    const avgProgress =
      totalTasks > 0
        ? Math.round(
            project.tasks.reduce((acc, t) => acc + t.progressPct, 0) /
              totalTasks,
          )
        : 0;

    const completedMilestones = project.milestones.filter(
      (m) => m.status === "COMPLETED",
    ).length;
    const totalMilestones = project.milestones.length;

    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          brand: project.brand,
          status: project.status,
          progressPct: project.progressPct,
          startDate: project.startDate,
          estimatedEndAt: project.estimatedEndAt,
          completedAt: project.completedAt,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          milestones: project.milestones,
          members: project.members.map(({ user }) => ({
            id: user.id,
            name: user.name,
            image: user.image,
            role: user.role,
          })),
          stats: {
            totalTasks,
            completedTasks,
            avgProgress,
            totalTimeSeconds,
            totalMilestones,
            completedMilestones,
            tasksByStatus: taskStatusMap,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
