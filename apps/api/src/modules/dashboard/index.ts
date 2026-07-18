import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import { authError, serverError } from "../../lib/http";
import { requireActiveMembership } from "../../lib/org";
import {
  getOpenStatusIds,
  parseOrgPreferences,
} from "../../lib/workflow";

export const dashboardRoutes = new Elysia({
  prefix: "/api/dashboard",
  tags: ["Dashboard"],
}).get("/", async ({ request, set }) => {
  try {
    const result = await requireActiveMembership(request.headers);
    if ("error" in result) return authError(set, result.error);

    const userId = result.session.user.id;
    const preferences = parseOrgPreferences(result.organization.metadata);
    const openStatusIds = getOpenStatusIds(preferences);
    const openStatusSet = new Set(openStatusIds.map(String));

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 30);

    const [
      projectMembers,
      assignedTasks,
      timeLogs,
      unreadNotifications,
      activeTimer,
      recentActivity,
    ] = await Promise.all([
      prisma.projectMember.findMany({
        where: { userId },
        select: {
          project: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.taskAssignee.findMany({
        where: { userId },
        select: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              endDate: true,
              completedAt: true,
              createdAt: true,
              project: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { task: { updatedAt: "desc" } },
        take: 100,
      }),
      prisma.timeLog.findMany({
        where: { userId },
        select: {
          duration: true,
          startedAt: true,
          endedAt: true,
        },
        orderBy: { startedAt: "desc" },
        take: 500,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
      prisma.timeLog.findFirst({
        where: { userId, endedAt: null },
        select: {
          id: true,
          startedAt: true,
          task: {
            select: {
              id: true,
              title: true,
              project: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
          project: { select: { id: true, name: true, slug: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const tasks = assignedTasks.map((a) => a.task);
    const openTasks = tasks.filter((t) => openStatusSet.has(t.status));
    const overdueTasks = openTasks.filter(
      (t) => t.endDate && new Date(t.endDate) < now,
    );
    const completedInPeriod = tasks.filter(
      (t) =>
        !openStatusSet.has(t.status) &&
        t.completedAt &&
        new Date(t.completedAt) >= periodStart,
    ).length;

    const tasksByStatus = tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalSeconds = timeLogs.reduce((sum, log) => sum + log.duration, 0);
    const secondsInPeriod = timeLogs
      .filter((log) => log.startedAt && new Date(log.startedAt) >= periodStart)
      .reduce((sum, log) => sum + log.duration, 0);

    const activeProjects = projectMembers.filter(
      (pm) => pm.project.status === "ACTIVE",
    );

    return {
      range: { days: 30 },
      stats: {
        openTasks: openTasks.length,
        overdueTasks: overdueTasks.length,
        completedInPeriod,
        totalAssigned: tasks.length,
        activeProjects: activeProjects.length,
        totalProjects: projectMembers.length,
        secondsInPeriod,
        totalSeconds,
        unreadNotifications,
      },
      tasksByStatus,
      activeTimer,
      recentTasks: openTasks.slice(0, 8).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        endDate: t.endDate,
        project: t.project,
      })),
      projects: activeProjects.slice(0, 6).map((pm) => pm.project),
      recentActivity,
    };
  } catch (error) {
    return serverError(set, error);
  }
});
