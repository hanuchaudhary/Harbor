import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import { TaskStatus as TaskStatusEnum } from "@repo/db/enums";
import { getStatusLevel } from "@/lib/constants";

const validStatuses = Object.values(TaskStatusEnum);
const isTaskStatus = (v: string): v is (typeof validStatuses)[number] =>
  validStatuses.includes(v as (typeof validStatuses)[number]);

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updates: { id: string; order: number; status?: string }[] =
      body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { message: "updates array is required" },
        { status: 400 },
      );
    }

    const statusChanges = updates.filter(
      (u) => u.status && isTaskStatus(u.status),
    );
    if (statusChanges.length > 0) {
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
              return NextResponse.json(
                {
                  message: `Cannot update "${task.title}": depends on "${dep.dependsOnTask.title}" which has lower status`,
                },
                { status: 400 },
              );
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log(
      `Error reordering tasks: ${error instanceof Error ? error.message : error}`,
    );
    return NextResponse.json(
      { message: "Failed to reorder tasks" },
      { status: 500 },
    );
  }
}
