import { Elysia } from "elysia";
import { prisma } from "@repo/db";
import { Prisma } from "@repo/db/client";
import { z } from "zod";

import { ACTIVITY_CATEGORIES } from "../../lib/activity/activity-display";
import { getPlatformAnalytics } from "../../lib/analytics/platform";
import {
  canViewPlatformAnalytics,
  parseAnalyticsRange,
} from "../../lib/analytics/utils";
import { auth } from "../../lib/auth";

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

export const adminRoutes = new Elysia({ prefix: "/api/admin", tags: ["Admin"] })
  .post("/validate", async ({ set, body }) => {
    const { key } = body as { key?: string };
    const adminKey = process.env.ADMIN_REGISTER_KEY;

    if (!adminKey) {
      set.status = 403;
      return { error: "Registration is disabled" };
    }

    if (key !== adminKey) {
      set.status = 401;
      return { error: "Invalid key" };
    }

    return { valid: true };
  })
  .get("/analytics", async ({ request, set, query }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
    if (!canViewPlatformAnalytics(session.user.role)) {
      set.status = 403;
      return { message: "Forbidden" };
    }

    const requestedRange = parseAnalyticsRange(
      query.range ? String(query.range) : null,
    );
    if (requestedRange === null) {
      set.status = 400;
      return { message: "Range must be one of 7, 30, or 90 days" };
    }

    return getPlatformAnalytics(requestedRange);
  })
  .get("/activity", async ({ request, set, query }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
    if (!canViewPlatformAnalytics(session.user.role)) {
      set.status = 403;
      return { message: "Forbidden" };
    }

    const parsedQuery = querySchema.safeParse(query);
    if (!parsedQuery.success) {
      set.status = 400;
      return { message: "Invalid query", errors: parsedQuery.error.issues };
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
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;

    return { items: page, nextCursor, total };
  })
  .get("/users/:id", async ({ request, set, params }) => {
    // Port of admin/users/[id] — load from Next source if needed for full detail
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
    if (session.user.role !== "ADMIN") {
      set.status = 403;
      return { message: "Forbidden" };
    }

    const user = await prisma.user.findFirst({
      where: { id: params.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
        isDesigner: true,
        githubUsername: true,
        createdAt: true,
        lastSeenAt: true,
        projectMembers: {
          select: {
            project: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
        projectClients: {
          select: {
            project: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
        _count: {
          select: {
            assignedTasks: true,
            timeLogs: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      set.status = 404;
      return { message: "User not found" };
    }

    return { user };
  });
