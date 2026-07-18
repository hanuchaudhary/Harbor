import { Elysia } from "elysia";
import { prisma } from "@repo/db";
import {
  TaskStatus as TaskStatusEnum,
  Priority as PriorityEnum,
  TimeLogType,
} from "@repo/db/enums";

import { auth } from "../../lib/auth";
import { logActivity } from "../../lib/actions/activity";
import { createNotifications } from "../../lib/actions/notification";
import { createGithubIssue } from "../../lib/actions/github";
import { ActivityParser } from "../../lib/activity/activity-parser";
import { getStatusLevel } from "../../lib/constants";
import { TIMER_HEARTBEAT_STALE_AFTER_MS } from "../../lib/timer";
import { S3Fncs } from "../../lib/s3/s3.func";
import { forbidden, notFound, serverError, badRequest } from "../../lib/http";
import {
  isStatusEnabledForOrg,
  parseOrgPreferences,
} from "../../lib/workflow";

const validStatuses = Object.values(TaskStatusEnum);
const validPriorities = Object.values(PriorityEnum);
const COMPLETED_TASK_RETENTION_DAYS = 14;

const isTaskStatus = (v: string): v is (typeof validStatuses)[number] =>
  validStatuses.includes(v as (typeof validStatuses)[number]);

const isPriority = (v: string): v is (typeof validPriorities)[number] =>
  validPriorities.includes(v as (typeof validPriorities)[number]);

async function getSessionOrgPreferences(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) return { session: null, preferences: {} as ReturnType<typeof parseOrgPreferences> };
  const orgId = session.session.activeOrganizationId;
  if (!orgId) return { session, preferences: {} as ReturnType<typeof parseOrgPreferences> };
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { metadata: true },
  });
  return {
    session,
    preferences: parseOrgPreferences(org?.metadata),
  };
}

const taskSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  startDate: true,
  endDate: true,
  completedAt: true,
  progressPct: true,
  createdById: true,
  order: true,
  project: {
    select: { id: true, name: true, slug: true },
  },
  repo: {
    select: { id: true, name: true, url: true },
  },
  assignees: {
    select: {
      id: true,
      user: { select: { id: true, name: true, image: true } },
    },
  },
  dependencies: {
    select: {
      dependsOnTask: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  },
  tags: {
    select: {
      tag: { select: { id: true, name: true, color: true } },
    },
  },
  createdAt: true,
  timeLogs: { select: { duration: true } },
} as const;

type TaskWithTimeLogs = Awaited<
  ReturnType<typeof prisma.task.findFirst<{ select: typeof taskSelect }>>
>;

function mapTask(t: NonNullable<TaskWithTimeLogs>) {
  const { timeLogs, ...rest } = t;
  return {
    ...rest,
    totalTime: timeLogs.reduce((sum, l) => sum + (l.duration ?? 0), 0),
  };
}

const timeLogSelect = {
  id: true,
  taskId: true,
  userId: true,
  type: true,
  duration: true,
  startedAt: true,
  endedAt: true,
  lastHeartbeatAt: true,
  note: true,
  isRunning: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, image: true } },
};

async function checkCircularDependency(
  startTaskId: string,
  targetTaskId: string,
): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [startTaskId];

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;

    if (visited.has(currentTaskId)) {
      continue;
    }

    if (currentTaskId === targetTaskId) {
      return true;
    }

    visited.add(currentTaskId);

    const dependencies = await prisma.taskDependency.findMany({
      where: { taskId: currentTaskId },
      select: { dependsOnTaskId: true },
    });

    for (const dep of dependencies) {
      if (!visited.has(dep.dependsOnTaskId)) {
        queue.push(dep.dependsOnTaskId);
      }
    }
  }

  return false;
}

export const taskRoutes = new Elysia({
  prefix: "/api/tasks",
  tags: ["Tasks"],
})
  .get("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const role = session.user.role;

    try {
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get("projectId") || "";
      const status = searchParams.get("status") || "";
      const priority = searchParams.get("priority") || "";
      const limitPerStatus = parseInt(
        searchParams.get("limitPerStatus") || "0",
        10,
      );
      const cursor = searchParams.get("cursor") || "";
      const cursorStatus = searchParams.get("cursorStatus") || "";
      const completedRetentionCutoff = new Date(
        Date.now() - COMPLETED_TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const canSeeArchivedCompleted = role === "ADMIN";

      const baseWhere = {
        deletedAt: null,
        ...(projectId && { projectId }),
        ...(priority && isPriority(priority) && { priority }),
        ...(!canSeeArchivedCompleted && {
          NOT: {
            status: TaskStatusEnum.COMPLETED,
            completedAt: { lt: completedRetentionCutoff },
          },
        }),
      };

      if (status && isTaskStatus(status)) {
        const where = { ...baseWhere, status, deletedAt: null };
        const tasks = await prisma.task.findMany({
          where,
          select: taskSelect,
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          ...(limitPerStatus > 0 && { take: limitPerStatus + 1 }),
          ...(cursor && {
            cursor: { id: cursor },
            skip: 1,
          }),
        });

        const hasMore = limitPerStatus > 0 && tasks.length > limitPerStatus;
        const result = hasMore ? tasks.slice(0, limitPerStatus) : tasks;
        const nextCursor = hasMore ? result[result.length - 1]?.id : undefined;

        return {
          tasks: result.map(mapTask),
          cursors: { [status]: nextCursor },
          hasMore: { [status]: hasMore },
          counts: { [status]: await prisma.task.count({ where }) },
        };
      }

      if (limitPerStatus > 0) {
        const statusList = validStatuses;
        const results: Record<string, ReturnType<typeof mapTask>[]> = {};
        const cursors: Record<string, string | undefined> = {};
        const hasMore: Record<string, boolean> = {};
        const counts: Record<string, number> = {};

        const cursorsMap: Record<string, string> = {};
        if (cursorStatus && cursor) {
          cursorStatus.split(",").forEach((s, i) => {
            const c = cursor.split(",")[i];
            if (c) cursorsMap[s] = c;
          });
        }

        await Promise.all(
          statusList.map(async (s) => {
            const where = { ...baseWhere, status: s, deletedAt: null };
            const cursorId = cursorsMap[s];

            const [tasks, count] = await Promise.all([
              prisma.task.findMany({
                where,
                select: taskSelect,
                orderBy: [{ order: "asc" }, { createdAt: "asc" }],
                take: limitPerStatus + 1,
                ...(cursorId && { cursor: { id: cursorId }, skip: 1 }),
              }),
              prisma.task.count({ where }),
            ]);

            const more = tasks.length > limitPerStatus;
            const limited = more ? tasks.slice(0, limitPerStatus) : tasks;

            results[s] = limited.map(mapTask);
            cursors[s] = more ? limited[limited.length - 1]?.id : undefined;
            hasMore[s] = more;
            counts[s] = count;
          }),
        );

        const allTasks = statusList.flatMap((s) => results[s] ?? []);

        return {
          tasks: allTasks,
          cursors,
          hasMore,
          counts,
        };
      }

      const tasks = await prisma.task.findMany({
        where: baseWhere,
        select: taskSelect,
        orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      });

      return { tasks: tasks.map(mapTask) };
    } catch (err) {
      console.log(err);
      set.status = 500;
      return { message: "Failed to fetch tasks" };
    }
  })
  .post("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const user = session.user;

    const githubAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "github",
      },
    });

    try {
      const body = (await request.json()) as {
        title?: string;
        description?: string;
        projectId?: string;
        repoId?: string;
        status?: string;
        priority?: string;
        startDate?: string;
        endDate?: string;
        assigneeIds?: string[];
        clientIds?: string[];
        tagIds?: string[];
      };
      const {
        title,
        description,
        projectId,
        repoId,
        status,
        priority,
        startDate,
        endDate,
        assigneeIds,
        clientIds,
        tagIds,
      } = body;

      if (!title || !title.trim()) {
        set.status = 400;
        return { message: "Title is required" };
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          repos: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      });

      if (!project) {
        set.status = 400;
        return { message: "Project not found" };
      }

      const { preferences } = await getSessionOrgPreferences(request.headers);
      let resolvedStatus =
        status && isTaskStatus(status) ? status : TaskStatusEnum.TODO;
      if (!isStatusEnabledForOrg(preferences, resolvedStatus)) {
        const enabled = Object.values(TaskStatusEnum).find((s) =>
          isStatusEnabledForOrg(preferences, s),
        );
        if (status && isTaskStatus(status)) {
          return badRequest(
            set,
            `Status "${status}" is disabled for this organization`,
          );
        }
        resolvedStatus = enabled ?? TaskStatusEnum.TODO;
      }

      const maxOrderTask = await prisma.task.findFirst({
        where: { projectId, status: resolvedStatus, deletedAt: null },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      const nextOrder = (maxOrderTask?.order ?? -1) + 1;

      const allUserIds = Array.from(
        new Set([
          ...(Array.isArray(assigneeIds) ? assigneeIds : []),
          ...(Array.isArray(clientIds) ? clientIds : []),
        ]),
      );

      const task = await prisma.$transaction(async (tx) => {
        const created = await tx.task.create({
          data: {
            title: title.trim(),
            description: description || null,
            projectId,
            createdById: session.user.id,
            repoId: repoId || null,
            status: resolvedStatus,
            priority:
              priority && isPriority(priority) ? priority : PriorityEnum.MEDIUM,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            order: nextOrder,
            assignees:
              allUserIds.length > 0
                ? {
                    create: allUserIds.map((userId: string) => ({ userId })),
                  }
                : undefined,
            tags:
              Array.isArray(tagIds) && tagIds.length > 0
                ? {
                    create: tagIds.map((tagId: string) => ({ tagId })),
                  }
                : undefined,
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            createdById: true,
            startDate: true,
            endDate: true,
            completedAt: true,
            progressPct: true,
            order: true,
            createdAt: true,
            updatedAt: true,
            repoId: true,
            projectId: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                repos: { select: { id: true, name: true } },
              },
            },
            assignees: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    githubUsername: true,
                  },
                },
              },
            },
            tags: {
              select: {
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
        });

        if (allUserIds.length > 0) {
          await tx.projectMember.createMany({
            data: allUserIds.map((userId: string) => ({ projectId, userId })),
            skipDuplicates: true,
          });
        }

        await logActivity(tx, {
          userId: session.user.id,
          action: "TASK_CREATED",
          projectId: created.projectId,
          taskId: created.id,
          metadata: {
            description: ActivityParser.task.created(
              created.title,
              created.project.name,
            ),
          },
        });

        const notifyIds = allUserIds.filter(
          (id: string) => id !== session.user.id,
        );
        await createNotifications(tx, notifyIds, {
          title: "Task assigned",
          body: `You've been assigned to '${created.title}'`,
          link: `/tracker/${created.id}`,
        });

        return created;
      });

      const selectedRepo = repoId
        ? project.repos.find((r) => r.id === repoId)
        : undefined;

      if (selectedRepo && githubAccount?.accessToken) {
        const urlParts = selectedRepo.url.split("/");
        const repoOwner = urlParts[urlParts.length - 2] || "OceanLab-Technology";
        const repoName = urlParts[urlParts.length - 1];
        try {
          await createGithubIssue({
            body: task.description || "",
            owner: repoOwner,
            repo: repoName,
            title: task.title,
            token: githubAccount.accessToken,
            assignees: task.assignees
              .map((a) => a.user.githubUsername)
              .filter(Boolean) as string[],
            labels: task.tags.map((t) => t.tag.name),
          });
        } catch (error) {
          console.error("Error creating GitHub issue for task:", error);
        }
      }

      set.status = 201;
      return { task };
    } catch (err) {
      console.log(err);
      set.status = 500;
      return { message: "Failed to create task" };
    }
  })
  .patch("/reorder", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    try {
      const body = (await request.json()) as {
        updates?: { id: string; order: number; status?: string }[];
      };
      const updates = body.updates;

      if (!Array.isArray(updates) || updates.length === 0) {
        set.status = 400;
        return { message: "updates array is required" };
      }

      const statusChanges = updates.filter(
        (u) => u.status && isTaskStatus(u.status),
      );
      if (statusChanges.length > 0) {
        const { preferences } = await getSessionOrgPreferences(request.headers);
        for (const update of statusChanges) {
          if (
            update.status &&
            !isStatusEnabledForOrg(preferences, update.status)
          ) {
            set.status = 400;
            return {
              message: `Status "${update.status}" is disabled for this organization`,
            };
          }
        }

        const taskIds = statusChanges.map((u) => u.id);
        const tasks = await prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, status: true, title: true },
        });
        const taskMap = new Map(tasks.map((t) => [t.id, t]));

        const changedTaskIds = statusChanges
          .filter((u) => {
            const task = taskMap.get(u.id);
            return task && task.status !== u.status;
          })
          .map((u) => u.id);

        if (changedTaskIds.length > 0) {
          const dependencies = await prisma.taskDependency.findMany({
            where: { taskId: { in: changedTaskIds } },
            include: {
              dependsOnTask: { select: { id: true, title: true, status: true } },
            },
          });

          for (const update of statusChanges) {
            const task = taskMap.get(update.id);
            if (!task || task.status === update.status) continue;

            const taskDeps = dependencies.filter((d) => d.taskId === update.id);
            const nextLevel = getStatusLevel(update.status as TaskStatusEnum);

            for (const dep of taskDeps) {
              const depLevel = getStatusLevel(dep.dependsOnTask.status);
              if (nextLevel > depLevel) {
                set.status = 400;
                return {
                  message: `Cannot update "${task.title}": depends on "${dep.dependsOnTask.title}" which has lower status`,
                };
              }
            }
          }
        }
      }

      const caseOrder = updates
        .map((u) => `WHEN id = '${u.id}' THEN ${u.order}`)
        .join(" ");
      const caseStatus = updates
        .filter((u) => u.status && isTaskStatus(u.status))
        .map((u) => `WHEN id = '${u.id}' THEN '${u.status}'::\"TaskStatus"`)
        .join(" ");
      const ids = updates.map((u) => `'${u.id}'`).join(",");

      const statusClause = caseStatus
        ? `, status = CASE ${caseStatus} ELSE status END`
        : "";

      await prisma.$executeRawUnsafe(`
      UPDATE "Task"
      SET "order" = CASE ${caseOrder} ELSE "order" END,
          "updatedAt" = NOW()
          ${statusClause}
      WHERE id IN (${ids})
    `);

      return { ok: true };
    } catch (error) {
      console.log(
        `Error reordering tasks: ${error instanceof Error ? error.message : error}`,
      );
      set.status = 500;
      return { message: "Failed to reorder tasks" };
    }
  })
  .get("/:taskId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          createdById: true,
          startDate: true,
          endDate: true,
          completedAt: true,
          progressPct: true,
          order: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          repoId: true,
          project: {
            select: { id: true, name: true, slug: true },
          },
          repo: {
            select: { id: true, name: true, url: true },
          },
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
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          _count: {
            select: {
              subtasks: true,
              dependencies: true,
              dependents: true,
              comments: true,
              attachments: true,
              timeLogs: true,
              history: true,
            },
          },
        },
      });

      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      return {
        task,
        counts: {
          subtasks: task._count.subtasks,
          dependencies: task._count.dependencies,
          dependents: task._count.dependents,
          comments: task._count.comments,
          attachments: task._count.attachments,
          timeLogs: task._count.timeLogs,
          history: task._count.history,
        },
      };
    } catch {
      set.status = 500;
      return { message: "Failed to fetch task" };
    }
  })
  .patch("/:taskId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const body = (await request.json()) as {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        startDate?: string;
        endDate?: string;
        progressPct?: number;
        repoId?: string;
      };
      const {
        title,
        description,
        status,
        priority,
        startDate,
        endDate,
        progressPct,
        repoId,
      } = body;

      const existing = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
      });

      if (!existing) {
        set.status = 404;
        return { message: "Task not found" };
      }

      const prevStatus = existing.status;
      const nextStatus = status && isTaskStatus(status) ? status : undefined;

      if (nextStatus && nextStatus !== prevStatus) {
        const { preferences } = await getSessionOrgPreferences(request.headers);
        if (!isStatusEnabledForOrg(preferences, nextStatus)) {
          return badRequest(
            set,
            `Status "${nextStatus}" is disabled for this organization`,
          );
        }

        const dependencies = await prisma.taskDependency.findMany({
          where: { taskId },
          include: {
            dependsOnTask: {
              select: { id: true, title: true, status: true },
            },
          },
        });

        const nextLevel = getStatusLevel(nextStatus);
        for (const dep of dependencies) {
          const depLevel = getStatusLevel(dep.dependsOnTask.status);
          if (nextLevel > depLevel) {
            set.status = 400;
            return {
              message: `Cannot update status: task depends on "${dep.dependsOnTask.title}" which has a lower status`,
            };
          }
        }
      }

      const task = await prisma.$transaction(async (tx) => {
        const updated = await tx.task.update({
          where: { id: taskId },
          data: {
            ...(title !== undefined && { title: title.trim() }),
            ...(description !== undefined && {
              description: description || null,
            }),
            ...(nextStatus && { status: nextStatus }),
            ...(priority && isPriority(priority) && { priority }),
            ...(startDate !== undefined && {
              startDate: startDate ? new Date(startDate) : null,
            }),
            ...(endDate !== undefined && {
              endDate: endDate ? new Date(endDate) : null,
            }),
            ...(progressPct !== undefined && {
              progressPct: Math.max(0, Math.min(100, Number(progressPct))),
            }),
            ...(repoId !== undefined && {
              repoId: repoId || null,
            }),
            ...(nextStatus === TaskStatusEnum.COMPLETED && {
              completedAt: new Date(),
            }),
            ...(nextStatus &&
              nextStatus !== TaskStatusEnum.COMPLETED && { completedAt: null }),
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            createdById: true,
            startDate: true,
            endDate: true,
            completedAt: true,
            progressPct: true,
            order: true,
            createdAt: true,
            updatedAt: true,
            projectId: true,
            repoId: true,
            project: {
              select: { id: true, name: true, slug: true },
            },
            repo: {
              select: { id: true, name: true, url: true },
            },
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
                tag: { select: { id: true, name: true, color: true } },
              },
            },
          },
        });

        if (nextStatus && nextStatus !== prevStatus) {
          await tx.taskStatusHistory.create({
            data: {
              taskId,
              from: prevStatus,
              to: nextStatus,
              changedBy: session.user.id,
            },
          });
        }

        const activityAction =
          nextStatus === TaskStatusEnum.COMPLETED && nextStatus !== prevStatus
            ? "TASK_COMPLETED"
            : prevStatus === TaskStatusEnum.COMPLETED &&
                nextStatus &&
                nextStatus !== prevStatus
              ? "TASK_REOPENED"
              : nextStatus && nextStatus !== prevStatus
                ? "TASK_STATUS_CHANGED"
                : priority !== undefined
                  ? "TASK_PRIORITY_CHANGED"
                  : endDate !== undefined
                    ? "TASK_DEADLINE_CHANGED"
                    : description !== undefined
                      ? "TASK_DESCRIPTION_UPDATED"
                      : "TASK_UPDATED";

        const changes = {
          ...(title !== undefined &&
            existing.title !== updated.title && {
              title: { from: existing.title, to: updated.title },
            }),
          ...(description !== undefined &&
            existing.description !== updated.description && {
              description: {
                from: existing.description,
                to: updated.description,
              },
            }),
          ...(nextStatus &&
            existing.status !== updated.status && {
              status: { from: existing.status, to: updated.status },
            }),
          ...(priority !== undefined &&
            existing.priority !== updated.priority && {
              priority: { from: existing.priority, to: updated.priority },
            }),
          ...(startDate !== undefined && {
            startDate: { from: existing.startDate, to: updated.startDate },
          }),
          ...(endDate !== undefined && {
            endDate: { from: existing.endDate, to: updated.endDate },
          }),
          ...(progressPct !== undefined &&
            existing.progressPct !== updated.progressPct && {
              progressPct: {
                from: existing.progressPct,
                to: updated.progressPct,
              },
            }),
        };

        await logActivity(tx, {
          userId: session.user.id,
          action: activityAction,
          projectId: existing.projectId,
          taskId,
          metadata: {
            description: ActivityParser.task.updated(updated.title, changes),
            entity: { type: "task", id: taskId, name: updated.title },
            context: {
              projectId: updated.project.id,
              projectName: updated.project.name,
              projectSlug: updated.project.slug,
              taskId,
              taskTitle: updated.title,
            },
            changes: Object.entries(changes).map(([field, value]) => ({
              field,
              from:
                value.from instanceof Date
                  ? value.from.toISOString()
                  : value.from,
              to: value.to instanceof Date ? value.to.toISOString() : value.to,
            })),
          },
        });

        const notifyIds = updated.assignees
          .map((a) => a.user.id)
          .filter((id) => id !== session.user.id);
        await createNotifications(tx, notifyIds, {
          title: "Task updated",
          body: `Task '${updated.title}' has been updated`,
          link: `/tracker/${taskId}`,
        });

        return updated;
      });

      return { task };
    } catch (e) {
      console.error(e);
      set.status = 500;
      return { message: "Failed to update task" };
    }
  })
  .delete("/:taskId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const existing = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
          id: true,
          title: true,
          projectId: true,
          status: true,
          project: { select: { slug: true } },
          assignees: { select: { userId: true } },
        },
      });

      if (!existing) {
        set.status = 404;
        return { message: "Task not found" };
      }

      await prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id: taskId },
          data: { deletedAt: new Date() },
        });

        await tx.taskDependency.deleteMany({
          where: { OR: [{ taskId }, { dependsOnTaskId: taskId }] },
        });

        await logActivity(tx, {
          userId: session.user.id,
          action: "TASK_DELETED",
          projectId: existing.projectId,
          taskId,
          metadata: { description: ActivityParser.task.deleted(existing.title) },
        });

        const notifyIds = existing.assignees
          .map((a) => a.userId)
          .filter((id) => id !== session.user.id);
        await createNotifications(tx, notifyIds, {
          title: "Task deleted",
          body: `Task '${existing.title}' has been deleted`,
        });
      });

      return { message: "Task deleted" };
    } catch {
      set.status = 500;
      return { message: "Failed to delete task" };
    }
  })
  .patch("/:taskId/assignees", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    try {
      const { taskId } = params;
      const body = (await request.json()) as { assigneeIds?: unknown };
      const { assigneeIds } = body;

      if (!Array.isArray(assigneeIds)) {
        set.status = 400;
        return { message: "assigneeIds must be an array" };
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
          id: true,
          title: true,
          projectId: true,
          assignees: {
            select: { userId: true, user: { select: { name: true } } },
          },
        },
      });

      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      const previousIds = new Set(task.assignees.map(({ userId }) => userId));
      const nextIds = new Set(assigneeIds as string[]);
      const addedIds = [...nextIds].filter((id) => !previousIds.has(id));
      const removedIds = [...previousIds].filter((id) => !nextIds.has(id));
      const addedUsers = await prisma.user.findMany({
        where: { id: { in: addedIds } },
        select: { id: true, name: true },
      });
      const previousNames = new Map(
        task.assignees.map(({ userId, user }) => [userId, user.name]),
      );
      const addedNames = addedUsers.map(({ name }) => name);
      const removedNames = removedIds.map(
        (id) => previousNames.get(id) ?? "Unknown user",
      );

      await prisma.$transaction(async (tx) => {
        await tx.taskAssignee.deleteMany({
          where: { taskId },
        });

        if (assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: assigneeIds.map((userId: string) => ({
              taskId,
              userId,
            })),
          });
        }

        if (addedIds.length > 0 || removedIds.length > 0) {
          await logActivity(tx, {
            userId: session.user.id,
            action: addedIds.length > 0 ? "TASK_ASSIGNED" : "TASK_UNASSIGNED",
            projectId: task.projectId,
            taskId,
            metadata: {
              description: ActivityParser.task.assigneesUpdated(
                task.title,
                addedNames,
                removedNames,
              ),
              entity: { type: "task", id: taskId, name: task.title },
              context: { taskId, taskTitle: task.title },
              changes: [
                {
                  field: "assignees",
                  from: removedNames.join(", ") || null,
                  to: addedNames.join(", ") || null,
                },
              ],
            },
          });
        }

        const notifyIds = assigneeIds.filter(
          (id: string) => id !== session.user.id,
        );
        if (notifyIds.length > 0) {
          await createNotifications(tx, notifyIds, {
            title: "Task assigned",
            body: `You have been assigned to '${task.title}'`,
            link: `/tracker/${taskId}`,
          });
        }
      });

      return { message: "Assignees updated" };
    } catch (error) {
      console.error(error);
      return serverError(set, error);
    }
  })
  .get("/:taskId/comments", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
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

      return { comments };
    } catch {
      set.status = 500;
      return { message: "Failed to fetch comments" };
    }
  })
  .post("/:taskId/comments", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const { body, mentionIds = [] } = (await request.json()) as {
        body?: string;
        mentionIds?: string[];
      };
      if (!body?.trim()) {
        set.status = 400;
        return { message: "Body is required" };
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: {
          id: true,
          title: true,
          projectId: true,
          project: { select: { name: true, slug: true } },
          assignees: { select: { userId: true } },
        },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }
      const mentionedUsers =
        Array.isArray(mentionIds) && mentionIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: mentionIds } },
              select: { id: true, name: true },
            })
          : [];

      const comment = await prisma.$transaction(async (tx) => {
        const created = await tx.comment.create({
          data: { taskId, userId: session.user.id, body: body.trim() },
          select: {
            id: true,
            body: true,
            isEdited: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
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
          metadata: {
            description: ActivityParser.comment.added(task.title),
            entity: { type: "comment", id: created.id },
            context: {
              projectId: task.projectId,
              projectName: task.project.name,
              projectSlug: task.project.slug,
              taskId,
              taskTitle: task.title,
            },
          },
        });

        for (const mentionedUser of mentionedUsers) {
          await logActivity(tx, {
            userId: session.user.id,
            action: "MENTION_ADDED",
            projectId: task.projectId,
            taskId,
            metadata: {
              description: `Mentioned '${mentionedUser.name}' in a comment on task '${task.title}'`,
              entity: { type: "comment", id: created.id },
              target: {
                type: "user",
                id: mentionedUser.id,
                name: mentionedUser.name,
              },
              context: {
                projectId: task.projectId,
                projectName: task.project.name,
                projectSlug: task.project.slug,
                taskId,
                taskTitle: task.title,
              },
            },
          });
        }

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

      set.status = 201;
      return { comment };
    } catch (error) {
      console.log(error);
      set.status = 500;
      return { message: "Failed to add comment" };
    }
  })
  .patch("/:taskId/comments/:commentId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId, commentId } = params;

    try {
      const { body } = (await request.json()) as { body?: string };
      if (!body?.trim()) {
        set.status = 400;
        return { message: "Body is required" };
      }

      const existing = await prisma.comment.findFirst({
        where: { id: commentId, taskId, userId: session.user.id },
        include: {
          task: { select: { title: true, projectId: true } },
        },
      });
      if (!existing) {
        set.status = 404;
        return { message: "Comment not found" };
      }

      const comment = await prisma.$transaction(async (tx) => {
        const updated = await tx.comment.update({
          where: { id: commentId },
          data: { body: body.trim(), isEdited: true },
          select: {
            id: true,
            body: true,
            isEdited: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        });

        await logActivity(tx, {
          userId: session.user.id,
          action: "COMMENT_EDITED",
          projectId: existing.task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.comment.updated(existing.task.title),
            entity: { type: "comment", id: commentId },
            context: { taskId, taskTitle: existing.task.title },
          },
        });

        return updated;
      });

      return { comment };
    } catch {
      set.status = 500;
      return { message: "Failed to edit comment" };
    }
  })
  .delete("/:taskId/comments/:commentId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId, commentId } = params;

    try {
      const existing = await prisma.comment.findFirst({
        where: { id: commentId, taskId, userId: session.user.id },
        include: {
          task: { select: { title: true, projectId: true } },
        },
      });
      if (!existing) {
        set.status = 404;
        return { message: "Comment not found" };
      }

      await prisma.$transaction(async (tx) => {
        await tx.comment.delete({ where: { id: commentId } });
        await logActivity(tx, {
          userId: session.user.id,
          action: "COMMENT_DELETED",
          projectId: existing.task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.comment.deleted(existing.task.title),
            entity: { type: "comment", id: commentId },
            context: { taskId, taskTitle: existing.task.title },
          },
        });
      });
      return { message: "Comment deleted" };
    } catch {
      set.status = 500;
      return { message: "Failed to delete comment" };
    }
  })
  .get("/:taskId/dependencies", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      const dependencies = await prisma.taskDependency.findMany({
        where: { taskId },
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
        orderBy: { createdAt: "asc" },
      });

      const dependents = await prisma.taskDependency.findMany({
        where: { dependsOnTaskId: taskId },
        select: {
          id: true,
          taskId: true,
          createdAt: true,
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      set.status = 200;
      return { dependencies, dependents };
    } catch (error) {
      console.error("Failed to fetch dependencies:", error);
      set.status = 500;
      return { message: "Failed to fetch dependencies" };
    }
  })
  .post("/:taskId/dependencies", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const { dependsOnTaskId } = (await request.json()) as {
        dependsOnTaskId?: string;
      };
      if (!dependsOnTaskId) {
        set.status = 400;
        return { message: "dependsOnTaskId is required" };
      }

      if (taskId === dependsOnTaskId) {
        set.status = 400;
        return { message: "A task cannot depend on itself" };
      }

      const [task, dependsOnTask] = await Promise.all([
        prisma.task.findFirst({
          where: { id: taskId, deletedAt: null },
          select: {
            id: true,
            title: true,
            projectId: true,
            project: { select: { slug: true } },
            assignees: { select: { userId: true } },
          },
        }),
        prisma.task.findFirst({
          where: { id: dependsOnTaskId, deletedAt: null },
          select: {
            id: true,
            title: true,
            projectId: true,
            status: true,
          },
        }),
      ]);

      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      if (!dependsOnTask) {
        set.status = 404;
        return { message: "Dependency task not found" };
      }

      if (task.projectId !== dependsOnTask.projectId) {
        set.status = 400;
        return { message: "Tasks must be in the same project" };
      }

      const existingDep = await prisma.taskDependency.findFirst({
        where: { taskId, dependsOnTaskId },
      });
      if (existingDep) {
        set.status = 400;
        return { message: "Dependency already exists" };
      }

      const wouldCreateCircular = await checkCircularDependency(
        dependsOnTaskId,
        taskId,
      );
      if (wouldCreateCircular) {
        set.status = 400;
        return { message: "This would create a circular dependency" };
      }

      const dependency = await prisma.$transaction(async (tx) => {
        const created = await tx.taskDependency.create({
          data: { taskId, dependsOnTaskId },
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
        });

        await logActivity(tx, {
          userId: session.user.id,
          action: "TASK_DEPENDENCY_ADDED",
          projectId: task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.task.dependencyAdded(
              task.title,
              dependsOnTask.title,
            ),
          },
        });

        const notifyIds = task.assignees
          .map((a) => a.userId)
          .filter((id) => id !== session.user.id);
        await createNotifications(tx, notifyIds, {
          title: "Task dependency added",
          body: `'${task.title}' now depends on '${dependsOnTask.title}'`,
          link: `/tracker/${taskId}`,
        });

        return created;
      });

      set.status = 201;
      return { dependency };
    } catch (error) {
      console.error("Failed to create dependency:", error);
      set.status = 500;
      return { message: "Failed to create dependency" };
    }
  })
  .delete("/:taskId/dependencies", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;
    const { searchParams } = new URL(request.url);
    const dependencyId = searchParams.get("dependencyId");

    if (!dependencyId) {
      set.status = 400;
      return { message: "dependencyId is required" };
    }

    try {
      const dependency = await prisma.taskDependency.findUnique({
        where: { id: dependencyId },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              projectId: true,
              assignees: { select: { userId: true } },
            },
          },
          dependsOnTask: {
            select: { id: true, title: true },
          },
        },
      });

      if (!dependency) {
        set.status = 404;
        return { message: "Dependency not found" };
      }

      if (dependency.taskId !== taskId) {
        return forbidden(set);
      }

      await prisma.$transaction(async (tx) => {
        await tx.taskDependency.delete({ where: { id: dependencyId } });

        await logActivity(tx, {
          userId: session.user.id,
          action: "TASK_DEPENDENCY_REMOVED",
          projectId: dependency.task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.task.dependencyRemoved(
              dependency.task.title,
              dependency.dependsOnTask.title,
            ),
          },
        });

        const notifyIds = dependency.task.assignees
          .map((a) => a.userId)
          .filter((id) => id !== session.user.id);
        await createNotifications(tx, notifyIds, {
          title: "Task dependency removed",
          body: `Dependency removed from '${dependency.task.title}'`,
          link: `/tracker/${taskId}`,
        });
      });

      set.status = 200;
      return { message: "Dependency removed" };
    } catch {
      set.status = 500;
      return { message: "Failed to remove dependency" };
    }
  })
  .patch("/:taskId/tags", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    try {
      const { taskId } = params;
      const body = (await request.json()) as { tagIds?: unknown };
      const { tagIds } = body;

      if (!Array.isArray(tagIds)) {
        set.status = 400;
        return { message: "tagIds must be an array" };
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
        set.status = 404;
        return { message: "Task not found" };
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

      return { message: "Tags updated" };
    } catch (error) {
      console.error(error);
      return serverError(set, error);
    }
  })
  .get("/:taskId/subtasks", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      const subtasks = await prisma.subtask.findMany({
        where: { taskId },
        select: {
          id: true,
          title: true,
          isDone: true,
          deadline: true,
          order: true,
        },
        orderBy: { order: "asc" },
      });

      return { subtasks };
    } catch {
      set.status = 500;
      return { message: "Failed to fetch subtasks" };
    }
  })
  .post("/:taskId/subtasks", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const { title } = (await request.json()) as { title?: string };
      if (!title?.trim()) {
        set.status = 400;
        return { message: "Title is required" };
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
        set.status = 404;
        return { message: "Task not found" };
      }

      const count = await prisma.subtask.count({ where: { taskId } });

      const subtask = await prisma.$transaction(async (tx) => {
        const created = await tx.subtask.create({
          data: { taskId, title: title.trim(), order: count },
          select: {
            id: true,
            title: true,
            isDone: true,
            deadline: true,
            order: true,
          },
        });

        await logActivity(tx, {
          userId: session.user.id,
          action: "SUBTASK_CREATED",
          projectId: task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.subtask.added(created.title, task.title),
          },
        });

        const notifyIds = task.assignees
          .map((a) => a.userId)
          .filter((id) => id !== session.user.id);
        await createNotifications(tx, notifyIds, {
          title: "New subtask",
          body: `A subtask '${created.title}' was added to '${task.title}'`,
          link: `/tracker/${taskId}`,
        });

        return created;
      });

      set.status = 201;
      return { subtask };
    } catch {
      set.status = 500;
      return { message: "Failed to create subtask" };
    }
  })
  .patch("/:taskId/subtasks/:subtaskId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId, subtaskId } = params;

    try {
      const { title, isDone, deadline } = (await request.json()) as {
        title?: string;
        isDone?: boolean;
        deadline?: string;
      };

      const existing = await prisma.subtask.findFirst({
        where: { id: subtaskId, taskId },
        include: {
          task: { select: { title: true, projectId: true } },
        },
      });
      if (!existing) {
        set.status = 404;
        return { message: "Subtask not found" };
      }

      const subtask = await prisma.$transaction(async (tx) => {
        const updated = await tx.subtask.update({
          where: { id: subtaskId },
          data: {
            ...(title !== undefined && { title: title.trim() }),
            ...(isDone !== undefined && { isDone: Boolean(isDone) }),
            ...(deadline !== undefined && {
              deadline: deadline ? new Date(deadline) : null,
            }),
          },
          select: {
            id: true,
            title: true,
            isDone: true,
            deadline: true,
            order: true,
          },
        });
        const changes = {
          ...(title !== undefined &&
            existing.title !== updated.title && {
              title: { from: existing.title, to: updated.title },
            }),
          ...(isDone !== undefined &&
            existing.isDone !== updated.isDone && {
              isDone: { from: existing.isDone, to: updated.isDone },
            }),
          ...(deadline !== undefined && {
            deadline: { from: existing.deadline, to: updated.deadline },
          }),
        };
        const action =
          existing.isDone !== updated.isDone
            ? updated.isDone
              ? "SUBTASK_COMPLETED"
              : "SUBTASK_REOPENED"
            : "SUBTASK_UPDATED";

        await logActivity(tx, {
          userId: session.user.id,
          action,
          projectId: existing.task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.subtask.updated(updated.title, changes),
            entity: { type: "subtask", id: subtaskId, name: updated.title },
            context: { taskId, taskTitle: existing.task.title },
            changes: Object.entries(changes).map(([field, value]) => ({
              field,
              from:
                value.from instanceof Date
                  ? value.from.toISOString()
                  : value.from,
              to: value.to instanceof Date ? value.to.toISOString() : value.to,
            })),
          },
        });

        return updated;
      });
      return { subtask };
    } catch {
      set.status = 500;
      return { message: "Failed to update subtask" };
    }
  })
  .delete("/:taskId/subtasks/:subtaskId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId, subtaskId } = params;

    try {
      const existing = await prisma.subtask.findFirst({
        where: { id: subtaskId, taskId },
        include: {
          task: { select: { title: true, projectId: true } },
        },
      });
      if (!existing) {
        set.status = 404;
        return { message: "Subtask not found" };
      }

      await prisma.$transaction(async (tx) => {
        await tx.subtask.delete({ where: { id: subtaskId } });
        await logActivity(tx, {
          userId: session.user.id,
          action: "SUBTASK_DELETED",
          projectId: existing.task.projectId,
          taskId,
          metadata: {
            description: ActivityParser.subtask.deleted(
              existing.title,
              existing.task.title,
            ),
            entity: { type: "subtask", id: subtaskId, name: existing.title },
            context: { taskId, taskTitle: existing.task.title },
          },
        });
      });
      return { message: "Subtask deleted" };
    } catch {
      set.status = 500;
      return { message: "Failed to delete subtask" };
    }
  })
  .get("/:taskId/attachments", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
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

      return { attachments };
    } catch {
      set.status = 500;
      return { message: "Failed to fetch attachments" };
    }
  })
  .post("/:taskId/attachments", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;
    const body = (await request.json()) as {
      name?: string;
      fileUrl?: string;
      fileType?: string;
      fileSize?: number;
    };
    const { name, fileUrl, fileType, fileSize } = body;

    if (!name || !fileUrl || !fileType || fileSize == null) {
      set.status = 400;
      return {
        message: "name, fileUrl, fileType and fileSize are required",
      };
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
      set.status = 404;
      return { message: "Task not found" };
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

    set.status = 201;
    return { attachment };
  })
  .delete("/:taskId/attachments", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      set.status = 400;
      return { message: "attachmentId is required" };
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
      set.status = 404;
      return { message: "Attachment not found" };
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

    return { message: "Attachment deleted" };
  })
  .get("/:taskId/history", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      const history = await prisma.taskStatusHistory.findMany({
        where: { taskId },
        select: {
          id: true,
          from: true,
          to: true,
          changedBy: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return { history };
    } catch {
      set.status = 500;
      return { message: "Failed to fetch history" };
    }
  })
  .get("/:taskId/timelogs", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      const timeLogs = await prisma.timeLog.findMany({
        where: { taskId },
        select: timeLogSelect,
        orderBy: { createdAt: "desc" },
      });

      return { timeLogs };
    } catch {
      set.status = 500;
      return { message: "Failed to fetch time logs" };
    }
  })
  .post("/:taskId/timelogs", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const body = (await request.json()) as {
        duration?: number;
        type?: string;
        note?: string;
        startedAt?: string;
      };
      const { duration, type, note, startedAt } = body;

      if (!type || !["MANUAL", "AUTO"].includes(type)) {
        set.status = 400;
        return { message: "Invalid type" };
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true, projectId: true, title: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      if (type === "MANUAL") {
        if (!duration || typeof duration !== "number" || duration <= 0) {
          set.status = 400;
          return { message: "Invalid duration" };
        }

        const timeLog = await prisma.timeLog.create({
          data: {
            taskId,
            userId: session.user.id,
            type: type as TimeLogType,
            duration,
            note: note?.trim() || null,
            startedAt: startedAt ? new Date(startedAt) : null,
            isRunning: false,
          },
          select: timeLogSelect,
        });

        await logActivity(undefined, {
          userId: session.user.id,
          action: "TIMELOG_ADDED",
          projectId: task.projectId,
          taskId,
          metadata: {
            version: 1,
            description: ActivityParser.timeLog.added(task.title, duration, type),
            duration,
            type,
            taskTitle: task.title,
          },
        });

        set.status = 201;
        return { timeLog };
      }

      if (type === "AUTO") {
        const existing = await prisma.timeLog.findFirst({
          where: { taskId, userId: session.user.id, isRunning: true },
        });
        if (existing) {
          set.status = 409;
          return { message: "A timer is already running for this task" };
        }

        const now = new Date();
        const timeLog = await prisma.timeLog.create({
          data: {
            taskId,
            userId: session.user.id,
            type: type as TimeLogType,
            duration: 0,
            note: note?.trim() || null,
            startedAt: now,
            lastHeartbeatAt: now,
            isRunning: true,
          },
          select: timeLogSelect,
        });

        await logActivity(undefined, {
          userId: session.user.id,
          action: "TIMELOG_STARTED",
          projectId: task.projectId,
          taskId,
          metadata: {
            version: 1,
            description: ActivityParser.timeLog.started(task.title, type),
            type,
            taskTitle: task.title,
          },
        });

        set.status = 201;
        return { timeLog };
      }

      set.status = 400;
      return { message: "Invalid type" };
    } catch (error) {
      console.log(error);
      set.status = 500;
      return { message: "Failed to create time log" };
    }
  })
  .patch("/:taskId/timelogs", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId } = params;

    try {
      const body = (await request.json()) as { timeLogId?: string };
      const { timeLogId } = body;

      if (!timeLogId) {
        set.status = 400;
        return { message: "timeLogId is required" };
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true, projectId: true, title: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const running = await prisma.timeLog.findFirst({
          where: {
            id: timeLogId,
            taskId,
            userId: session.user.id,
            isRunning: true,
          },
        });
        if (!running) {
          set.status = 404;
          return { message: "No running timer found" };
        }

        const now = new Date();
        const checkpoint = running.lastHeartbeatAt ?? running.startedAt;
        const elapsedMs = checkpoint
          ? now.getTime() - checkpoint.getTime()
          : TIMER_HEARTBEAT_STALE_AFTER_MS + 1;
        const elapsed =
          elapsedMs >= 0 && elapsedMs <= TIMER_HEARTBEAT_STALE_AFTER_MS
            ? Math.floor(elapsedMs / 1000)
            : 0;
        const totalDuration = running.duration + elapsed;

        const result = await prisma.timeLog.updateMany({
          where: {
            id: running.id,
            isRunning: true,
            duration: running.duration,
            lastHeartbeatAt: running.lastHeartbeatAt,
          },
          data: {
            isRunning: false,
            endedAt: now,
            duration: totalDuration,
          },
        });
        if (result.count === 0) continue;

        const timeLog = await prisma.timeLog.findUnique({
          where: { id: running.id },
          select: timeLogSelect,
        });

        await logActivity(undefined, {
          userId: session.user.id,
          action: "TIMELOG_STOPPED",
          projectId: task.projectId,
          taskId,
          metadata: {
            version: 1,
            description: ActivityParser.timeLog.stopped(
              task.title,
              totalDuration,
            ),
            duration: totalDuration,
            taskTitle: task.title,
          },
        });

        return { timeLog };
      }

      set.status = 409;
      return {
        message: "Timer changed while it was being stopped; please retry",
      };
    } catch (error) {
      console.log(error);
      set.status = 500;
      return { message: "Failed to stop timer" };
    }
  })
  .patch("/:taskId/timelogs/:timeLogId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId, timeLogId } = params;

    try {
      const body = (await request.json()) as {
        duration?: number;
        note?: string;
        type?: string;
      };
      const { duration, note, type } = body;

      const existing = await prisma.timeLog.findFirst({
        where: { id: timeLogId, taskId, userId: session.user.id },
        select: {
          id: true,
          duration: true,
          note: true,
          type: true,
        },
      });
      if (!existing) {
        set.status = 404;
        return { message: "Time log not found" };
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true, projectId: true, title: true },
      });
      if (!task) {
        set.status = 404;
        return { message: "Task not found" };
      }

      const updated = await prisma.timeLog.update({
        where: { id: timeLogId },
        data: {
          ...(typeof duration === "number" && { duration }),
          ...(note !== undefined && { note: note?.trim() || null }),
          ...(type && { type }),
          editedAt: new Date(),
          editedById: session.user.id,
        },
        select: timeLogSelect,
      });

      const changes: {
        duration?: { from: number; to: number };
        note?: { from: string | null; to: string | null };
        type?: { from: string; to: string };
      } = {};

      if (typeof duration === "number" && duration !== existing.duration) {
        changes.duration = { from: existing.duration, to: duration };
      }
      if (note !== undefined && note !== existing.note) {
        changes.note = { from: existing.note, to: note?.trim() || null };
      }
      if (type && type !== existing.type) {
        changes.type = { from: existing.type, to: type };
      }

      await logActivity(undefined, {
        userId: session.user.id,
        action: "TIMELOG_UPDATED",
        projectId: task.projectId,
        taskId,
        metadata: {
          version: 1,
          description: ActivityParser.timeLog.updated(task.title, changes),
          taskTitle: task.title,
        },
      });

      const timeLog = updated;

      return { timeLog };
    } catch {
      set.status = 500;
      return { message: "Failed to update time log" };
    }
  })
  .delete("/:taskId/timelogs/:timeLogId", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { taskId, timeLogId } = params;

    try {
      const existing = await prisma.timeLog.findFirst({
        where: { id: timeLogId, taskId, userId: session.user.id },
        select: { id: true, duration: true },
      });
      if (!existing) {
        set.status = 404;
        return { message: "Time log not found" };
      }

      const task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        select: { id: true, projectId: true, title: true },
      });

      await prisma.timeLog.delete({ where: { id: timeLogId } });

      if (task) {
        await logActivity(undefined, {
          userId: session.user.id,
          action: "TIMELOG_DELETED",
          projectId: task.projectId,
          taskId,
          metadata: {
            version: 1,
            description: ActivityParser.timeLog.deleted(
              task.title,
              existing.duration,
            ),
            taskTitle: task.title,
          },
        });
      }

      return { message: "Time log deleted" };
    } catch {
      set.status = 500;
      return { message: "Failed to delete time log" };
    }
  });
