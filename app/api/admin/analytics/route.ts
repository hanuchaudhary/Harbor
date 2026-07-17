import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    projectsByStatus,
    tasksByStatus,
    overdueTasks,
    tasksCompletedThisMonth,
    tasksCompletedLastMonth,
    usersByRole,
    totalUsers,
    activeUsers,
    totalTimeLogs,
  ] = await Promise.all([
    prisma.project.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.task.count({
      where: {
        deletedAt: null,
        endDate: { lt: now },
        completedAt: null,
        status: { not: "COMPLETED" },
      },
    }),
    prisma.task.count({
      where: {
        deletedAt: null,
        completedAt: { gte: startOfMonth },
      },
    }),
    prisma.task.count({
      where: {
        deletedAt: null,
        completedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.timeLog.aggregate({
      _sum: { duration: true },
    }),
  ]);

  const projectCounts = Object.fromEntries(
    projectsByStatus.map((p) => [p.status, p._count]),
  );
  const taskCounts = Object.fromEntries(
    tasksByStatus.map((t) => [t.status, t._count]),
  );
  const roleCounts = Object.fromEntries(
    usersByRole.map((r) => [r.role, r._count]),
  );

  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0);
  const completedTasks = taskCounts["COMPLETED"] ?? 0;
  const openTasks = totalTasks - completedTasks;

  const completionChange =
    tasksCompletedLastMonth === 0
      ? null
      : Math.round(
          ((tasksCompletedThisMonth - tasksCompletedLastMonth) /
            tasksCompletedLastMonth) *
            100,
        );

  return NextResponse.json({
    projects: {
      total: Object.values(projectCounts).reduce((a, b) => a + b, 0),
      active: projectCounts["ACTIVE"] ?? 0,
      onHold: projectCounts["ON_HOLD"] ?? 0,
      completed: projectCounts["COMPLETED"] ?? 0,
      archived: projectCounts["ARCHIVED"] ?? 0,
    },
    tasks: {
      total: totalTasks,
      open: openTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      completedThisMonth: tasksCompletedThisMonth,
      completedLastMonth: tasksCompletedLastMonth,
      completionChange,
      byStatus: taskCounts,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      byRole: roleCounts,
    },
    totalTimeLogged: totalTimeLogs._sum.duration ?? 0,
  });
}
