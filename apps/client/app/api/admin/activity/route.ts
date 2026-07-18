import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { canViewPlatformAnalytics } from "@/lib/analytics/utils";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ACTIVITY_CATEGORIES } from "@/lib/activity/activity-display";
import { z } from "zod";

const PAGE_SIZE = 20;
const categoryValues = ACTIVITY_CATEGORIES.map(({ value }) => value);
const querySchema = z.object({
  cursor: z.string().min(1).optional(),
  category: z
    .string()
    .refine((value) => categoryValues.includes(value as never))
    .optional(),
  projectId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!canViewPlatformAnalytics(session.user.role)) {
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
  const { cursor, category, projectId, userId, from, to, search } =
    parsedQuery.data;

  const where: Prisma.ActivityLogWhereInput = {
    ...(category && { action: { startsWith: `${category}_` } }),
    ...(projectId && { projectId }),
    ...(userId && { userId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
    ...(search && {
      OR: [
        { action: { contains: search.toUpperCase().replace(/\s+/g, "_") } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { project: { name: { contains: search, mode: "insensitive" } } },
        { task: { title: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      take: PAGE_SIZE + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true, slug: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  const hasMore = items.length > PAGE_SIZE;
  const page = hasMore ? items.slice(0, PAGE_SIZE) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ items: page, nextCursor, total });
}
