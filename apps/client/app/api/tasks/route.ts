import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import {
  TaskStatus as TaskStatusEnum,
  Priority as PriorityEnum,
} from "@repo/db/enums";
import { logActivity } from "@/lib/actions/activity";
import { createNotifications } from "@/lib/actions/notification";
import { ActivityParser } from "@/lib/activity/activity-parser";
import { createGithubIssue } from "@/lib/actions/github";

const validStatuses = Object.values(TaskStatusEnum);
const validPriorities = Object.values(PriorityEnum);
const COMPLETED_TASK_RETENTION_DAYS = 14;

const isTaskStatus = (v: string): v is (typeof validStatuses)[number] =>
  validStatuses.includes(v as (typeof validStatuses)[number]);

const isPriority = (v: string): v is (typeof validPriorities)[number] =>
  validPriorities.includes(v as (typeof validPriorities)[number]);

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

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

      return NextResponse.json({
        tasks: result.map(mapTask),
        cursors: { [status]: nextCursor },
        hasMore: { [status]: hasMore },
        counts: { [status]: await prisma.task.count({ where }) },
      });
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

      return NextResponse.json({
        tasks: allTasks,
        cursors,
        hasMore,
        counts,
      });
    }

    const tasks = await prisma.task.findMany({
      where: baseWhere,
      select: taskSelect,
      orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ tasks: tasks.map(mapTask) });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { message: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;

  const githubAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "github",
    },
  });

  // #REMIND
  // review if not connected github then issues is. not going to create on github need to discuss with vansh
  // if (!githubAccount) {
  //   return NextResponse.json(
  //     { message: "You must link your GitHub account to create issues" },
  //     { status: 400 },
  //   );
  // }

  try {
    const body = await request.json();
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
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { message: "Project not found" },
        { status: 400 },
      );
    }

    const resolvedStatus =
      status && isTaskStatus(status) ? status : TaskStatusEnum.TODO;

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
            select: { tag: { select: { id: true, name: true, color: true } } },
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

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { message: "Failed to create task" },
      { status: 500 },
    );
  }
}
