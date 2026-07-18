import "server-only";

import { unstable_cache } from "next/cache";

import prisma from "@repo/db";
import {
  type AnalyticsRange,
  type AnalyticsSeriesPoint,
  type AnalyticsWorkload,
  type PlatformAnalytics,
} from "./types";
import { completionRate, percentageChange } from "./utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countMap(rows: { status: string; _count: number }[]) {
  return Object.fromEntries(rows.map((row) => [row.status, row._count]));
}

async function queryPlatformAnalytics(
  days: AnalyticsRange,
): Promise<PlatformAnalytics> {
  const today = startOfUtcDay(new Date());
  const periodStart = new Date(today.getTime() - (days - 1) * DAY_MS);
  const nextDay = new Date(today.getTime() + DAY_MS);
  const previousStart = new Date(periodStart.getTime() - days * DAY_MS);

  const [
    projectsByStatus,
    tasksByStatus,
    overdueTasks,
    usersByRole,
    totalUsers,
    activeUsers,
    totalTime,
    recentTasks,
    recentProjects,
    recentTimeLogs,
    assignments,
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
        endDate: { lt: new Date() },
        completedAt: null,
        status: { not: "COMPLETED" },
      },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isActive: true } }),
    prisma.timeLog.aggregate({ _sum: { duration: true } }),
    prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: [
          { createdAt: { gte: previousStart, lt: nextDay } },
          { completedAt: { gte: previousStart, lt: nextDay } },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        completedAt: true,
        status: true,
      },
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: previousStart, lt: nextDay },
      },
      select: { createdAt: true },
    }),
    prisma.timeLog.findMany({
      where: { createdAt: { gte: previousStart, lt: nextDay } },
      select: {
        createdAt: true,
        duration: true,
        userId: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.taskAssignee.findMany({
      where: { task: { deletedAt: null } },
      select: {
        userId: true,
        user: { select: { name: true, image: true } },
        task: { select: { status: true, completedAt: true } },
      },
    }),
  ]);

  const projectCounts = countMap(projectsByStatus);
  const taskCounts = countMap(tasksByStatus);
  const roleCounts = Object.fromEntries(
    usersByRole.map((row) => [row.role, row._count]),
  );

  const isCurrentPeriod = (date: Date | null) =>
    date !== null && date >= periodStart && date < nextDay;
  const isPreviousPeriod = (date: Date | null) =>
    date !== null && date >= previousStart && date < periodStart;

  const createdInPeriod = recentTasks.filter((task) =>
    isCurrentPeriod(task.createdAt),
  ).length;
  const createdInPreviousPeriod = recentTasks.filter((task) =>
    isPreviousPeriod(task.createdAt),
  ).length;
  const completedInPeriod = recentTasks.filter((task) =>
    isCurrentPeriod(task.completedAt),
  ).length;
  const completedInPreviousPeriod = recentTasks.filter((task) =>
    isPreviousPeriod(task.completedAt),
  ).length;
  const currentCompletionRate = completionRate(
    completedInPeriod,
    createdInPeriod,
  );
  const previousCompletionRate = completionRate(
    completedInPreviousPeriod,
    createdInPreviousPeriod,
  );

  const seriesByDate = new Map<string, AnalyticsSeriesPoint>();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(periodStart.getTime() + index * DAY_MS);
    const key = dateKey(date);
    seriesByDate.set(key, {
      date: key,
      tasksCreated: 0,
      tasksCompleted: 0,
      secondsLogged: 0,
      projectsCreated: 0,
    });
  }

  for (const task of recentTasks) {
    const created = seriesByDate.get(dateKey(task.createdAt));
    if (created) created.tasksCreated += 1;
    if (task.completedAt) {
      const completed = seriesByDate.get(dateKey(task.completedAt));
      if (completed) completed.tasksCompleted += 1;
    }
  }
  for (const project of recentProjects) {
    const point = seriesByDate.get(dateKey(project.createdAt));
    if (point) point.projectsCreated += 1;
  }
  for (const log of recentTimeLogs) {
    const point = seriesByDate.get(dateKey(log.createdAt));
    if (point) point.secondsLogged += log.duration;
  }

  const secondsInPeriod = recentTimeLogs
    .filter((log) => isCurrentPeriod(log.createdAt))
    .reduce((sum, log) => sum + log.duration, 0);
  const secondsInPreviousPeriod = recentTimeLogs
    .filter((log) => isPreviousPeriod(log.createdAt))
    .reduce((sum, log) => sum + log.duration, 0);

  const timeByUser = new Map<string, number>();
  for (const log of recentTimeLogs) {
    if (isCurrentPeriod(log.createdAt)) {
      timeByUser.set(
        log.userId,
        (timeByUser.get(log.userId) ?? 0) + log.duration,
      );
    }
  }

  const workloadByUser = new Map<string, AnalyticsWorkload>();
  for (const assignment of assignments) {
    const workload = workloadByUser.get(assignment.userId) ?? {
      userId: assignment.userId,
      name: assignment.user.name,
      image: assignment.user.image,
      openTasks: 0,
      completedTasks: 0,
      secondsLogged: timeByUser.get(assignment.userId) ?? 0,
    };
    if (assignment.task.status === "COMPLETED") {
      if (isCurrentPeriod(assignment.task.completedAt)) {
        workload.completedTasks += 1;
      }
    } else {
      workload.openTasks += 1;
    }
    workloadByUser.set(assignment.userId, workload);
  }

  for (const [userId, secondsLogged] of timeByUser) {
    if (!workloadByUser.has(userId)) {
      const log = recentTimeLogs.find((item) => item.userId === userId);
      if (log) {
        workloadByUser.set(userId, {
          userId,
          name: log.user.name,
          image: log.user.image,
          openTasks: 0,
          completedTasks: 0,
          secondsLogged,
        });
      }
    }
  }

  const totalTasks = Object.values(taskCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const totalProjects = Object.values(projectCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const completedTasks = taskCounts.COMPLETED ?? 0;
  const projectsCreatedInPeriod = recentProjects.filter((project) =>
    isCurrentPeriod(project.createdAt),
  ).length;
  const projectsCreatedInPreviousPeriod = recentProjects.filter((project) =>
    isPreviousPeriod(project.createdAt),
  ).length;

  return {
    range: {
      days,
      from: dateKey(periodStart),
      to: dateKey(today),
    },
    projects: {
      total: totalProjects,
      active: projectCounts.ACTIVE ?? 0,
      onHold: projectCounts.ON_HOLD ?? 0,
      completed: projectCounts.COMPLETED ?? 0,
      archived: projectCounts.ARCHIVED ?? 0,
      createdInPeriod: projectsCreatedInPeriod,
      createdInPreviousPeriod: projectsCreatedInPreviousPeriod,
    },
    tasks: {
      total: totalTasks,
      open: totalTasks - completedTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      createdInPeriod,
      createdInPreviousPeriod,
      completedInPeriod,
      completedInPreviousPeriod,
      completionRate: currentCompletionRate,
      previousCompletionRate,
      completionRateChange: percentageChange(
        currentCompletionRate,
        previousCompletionRate,
      ),
      byStatus: taskCounts,
    },
    time: {
      totalSeconds: totalTime._sum.duration ?? 0,
      secondsInPeriod,
      secondsInPreviousPeriod,
      change: percentageChange(secondsInPeriod, secondsInPreviousPeriod),
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      byRole: roleCounts,
    },
    series: [...seriesByDate.values()],
    workload: [...workloadByUser.values()].sort(
      (a, b) => b.openTasks - a.openTasks,
    ),
  };
}

export const getPlatformAnalytics = unstable_cache(
  queryPlatformAnalytics,
  ["platform-analytics-v2"],
  { revalidate: 60 },
);
