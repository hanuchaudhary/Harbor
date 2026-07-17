import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastSeenAt: true,
        githubUsername: true,
        projectMembers: {
          select: {
            id: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                brand: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        projectClients: {
          select: {
            id: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                brand: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        assignedTasks: {
          select: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                createdAt: true,
                completedAt: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: { task: { createdAt: "desc" } },
          take: 50,
        },
        timeLogs: {
          select: {
            id: true,
            duration: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
            task: {
              select: {
                id: true,
                title: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        comments: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        activityLogs: {
          select: {
            id: true,
            action: true,
            createdAt: true,
            metadata: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
        notifications: {
          select: {
            id: true,
            title: true,
            read: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: {
            projectMembers: true,
            projectClients: true,
            assignedTasks: true,
            timeLogs: true,
            comments: true,
            activityLogs: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const totalTimeLogged = user.timeLogs.reduce(
      (sum, log) => sum + log.duration,
      0,
    );

    const tasksByStatus = user.assignedTasks.reduce(
      (acc, { task }) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const tasksByPriority = user.assignedTasks.reduce(
      (acc, { task }) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const completedTasks = user.assignedTasks.filter(
      ({ task }) => task.status === "COMPLETED",
    ).length;

    const activeProjects = new Set([
      ...user.projectMembers
        .filter((pm) => pm.project.status === "ACTIVE")
        .map((pm) => pm.project.id),
      ...user.projectClients
        .filter((pc) => pc.project.status === "ACTIVE")
        .map((pc) => pc.project.id),
    ]).size;

    const analytics = {
      totalProjects: user.projectMembers.length + user.projectClients.length,
      activeProjects,
      totalTasks: user.assignedTasks.length,
      completedTasks,
      totalTimeLogged,
      totalComments: user._count.comments,
      totalActivities: user._count.activityLogs,
      unreadNotifications: user.notifications.filter((n) => !n.read).length,
      tasksByStatus,
      tasksByPriority,
    };

    return NextResponse.json(
      {
        user,
        analytics,
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
