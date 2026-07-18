import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import { z } from "zod";
import { canReadProjectActivity } from "@/lib/activity/activity-access";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
  taskId: z.string().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const project = await prisma.project.findFirst({
      where: { slug },
      select: {
        id: true,
        members: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        clients: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });
    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }
    const canView = canReadProjectActivity({
      role: session.user.role,
      isMember: project.members.length > 0,
      isClient: project.clients.length > 0,
    });
    if (!canView) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const parsedQuery = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsedQuery.success) {
      return NextResponse.json(
        { message: "Invalid query", errors: parsedQuery.error.issues },
        { status: 400 },
      );
    }
    const { limit: take, cursor, taskId } = parsedQuery.data;

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        projectId: project.id,
        ...(taskId && { taskId }),
      },
      select: {
        id: true,
        userId: true,
        projectId: true,
        taskId: true,
        action: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true, slug: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = activityLogs.length > take;
    const items = hasMore ? activityLogs.slice(0, take) : activityLogs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ activityLogs: items, nextCursor });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch activity logs" },
      { status: 500 },
    );
  }
}
