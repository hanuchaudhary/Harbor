import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
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

    return NextResponse.json({ history });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
