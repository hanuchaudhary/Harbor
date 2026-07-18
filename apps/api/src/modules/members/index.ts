import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import { auth } from "../../lib/auth";
import { authError, serverError } from "../../lib/http";

export const membersRoutes = new Elysia({
  prefix: "/api/members",
  tags: ["Members"],
}).get(
  "/",
  async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    try {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, email: true, image: true, role: true },
        orderBy: { name: "asc" },
      });
      return { users };
    } catch (error) {
      set.status = 500;
      return { message: "Failed to fetch members" };
    }
  },
);
