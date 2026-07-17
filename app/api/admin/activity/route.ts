import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const category = searchParams.get("category") ?? undefined; // e.g. "TASK", "PROJECT"
  const projectId = searchParams.get("projectId") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const where = {
    ...(category && { action: { startsWith: `${category}_` } }),
    ...(projectId && { projectId }),
    ...(userId && { userId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const items = await prisma.activityLog.findMany({
    take: PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, name: true, slug: true } },
      task: { select: { id: true, title: true } },
    },
  });

  const hasMore = items.length > PAGE_SIZE;
  const page = hasMore ? items.slice(0, PAGE_SIZE) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  const total = await prisma.activityLog.count({ where });

  return NextResponse.json({ items: page, nextCursor, total });
}
