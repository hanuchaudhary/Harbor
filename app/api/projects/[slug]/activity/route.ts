import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

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
    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const take = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const cursor = searchParams.get("cursor") ?? undefined;
    const taskId = searchParams.get("taskId") ?? undefined;

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
      },
      orderBy: { createdAt: "desc" },
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
