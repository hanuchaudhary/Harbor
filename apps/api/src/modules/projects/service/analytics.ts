import { auth } from "../../../lib/auth";
import { prisma } from "@repo/db";


export async function GET(request: Request, params: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { slug } = params;

  const project = await prisma.project.findFirst({
    where: { slug },
    select: { id: true },
  });

  if (!project) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const projectId = project.id;

  const [
    tasksByStatus,
    tasksByPriority,
    assigneeWorkload,
    timeByUser,
  ] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { projectId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.taskAssignee.groupBy({
      by: ["userId"],
      where: { task: { projectId, deletedAt: null } },
      _count: { _all: true },
    }),
    prisma.timeLog.groupBy({
      by: ["userId"],
      where: { task: { projectId, deletedAt: null } },
      _sum: { duration: true },
    }),
  ]);

  const userIds = [
    ...new Set([
      ...assigneeWorkload.map((a) => a.userId),
      ...timeByUser.map((t) => t.userId),
    ]),
  ];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const memberWorkload = userIds.map((userId) => ({
    userId,
    name: userMap[userId]?.name ?? "Unknown",
    image: userMap[userId]?.image ?? null,
    taskCount:
      assigneeWorkload.find((a) => a.userId === userId)?._count._all ?? 0,
    totalTimeMinutes:
      timeByUser.find((t) => t.userId === userId)?._sum.duration ?? 0,
  }));

  const totalTasks = tasksByStatus.reduce((s, t) => s + t._count._all, 0);
  const completedTasks =
    tasksByStatus.find((t) => t.status === "COMPLETED")?._count._all ?? 0;
  const totalTimeMinutes = timeByUser.reduce(
    (s, t) => s + (t._sum.duration ?? 0),
    0,
  );

  return Response.json({
    tasksByStatus: tasksByStatus.map((t) => ({
      status: t.status,
      count: t._count._all,
    })),
    tasksByPriority: tasksByPriority.map((t) => ({
      priority: t.priority,
      count: t._count._all,
    })),
    memberWorkload,
    summary: {
      totalTasks,
      completedTasks,
      totalTimeMinutes,
      openTasks: totalTasks - completedTasks,
    },
  });
}
