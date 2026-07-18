import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import { auth } from "../../lib/auth";

export const activeRoutes = new Elysia({
  prefix: "/api/active",
  tags: ["Active"],
})
  .post("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const now = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: now },
    });

    return { health: "ok", lastSeenAt: updatedUser.lastSeenAt };
  })
  .get("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const activeUsers = await prisma.user.findMany({
      where: {
        lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        lastSeenAt: true,
      },
      orderBy: { lastSeenAt: "desc" },
    });

    return { activeUsers };
  });
