import { Elysia } from "elysia";
import { prisma } from "@repo/db";
import { TaskStatus as TaskStatusEnum } from "@repo/db/enums";

import { auth } from "../../lib/auth";

const COMPLETED_TASK_RETENTION_DAYS = 14;

export const clientRoutes = new Elysia({
  prefix: "/api/client/projects",
  tags: ["Client"],
})
  .get("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    if (session.user.role !== "CLIENT") {
      set.status = 403;
      return { message: "Forbidden" };
    }

    try {
      const projects = await prisma.projectClient.findMany({
        where: { userId: session.user.id },
        select: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              status: true,
              startDate: true,
              estimatedEndAt: true,
              completedAt: true,
              createdAt: true,
              progressPct: true,
              _count: {
                select: {
                  tasks: { where: { deletedAt: null } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formattedProjects = projects.map(({ project }) => ({
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        estimatedEndAt: project.estimatedEndAt,
        completedAt: project.completedAt,
        createdAt: project.createdAt,
        progressPct: project.progressPct,
        _count: {
          tasks: project._count.tasks,
        },
      }));

      return { projects: formattedProjects };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { message: "Internal server error" };
    }
  })
  .get("/:slug", async ({ request, set, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    if (session.user.role !== "CLIENT") {
      set.status = 403;
      return { message: "Forbidden" };
    }

    try {
      const { slug } = params;

      const project = await prisma.project.findFirst({
        where: { slug, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
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
            },
          },
        },
      });

      if (!project) {
        set.status = 404;
        return { message: "Project not found" };
      }

      if (project.clients.length === 0) {
        set.status = 403;
        return { message: "Forbidden" };
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

      return {
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          status: project.status,
          progressPct: project.progressPct,
          startDate: project.startDate,
          estimatedEndAt: project.estimatedEndAt,
          completedAt: project.completedAt,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
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
            tasksByStatus: taskStatusMap,
          },
        },
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { message: "Internal server error" };
    }
  })
  .get("/:slug/tasks", async ({ request, set, params }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    if (session.user.role !== "CLIENT") {
      set.status = 403;
      return { message: "Forbidden" };
    }

    try {
      const { slug } = params;

      const project = await prisma.project.findFirst({
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
        set.status = 404;
        return { message: "Project not found" };
      }

      if (project.clients.length === 0) {
        set.status = 403;
        return { message: "Forbidden" };
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

      return { tasks: mappedTasks };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { message: "Internal server error" };
    }
  });
