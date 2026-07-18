import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import { logActivity } from "../../lib/actions/activity";
import { ActivityParser } from "../../lib/activity/activity-parser";
import { auth } from "../../lib/auth";
import { authError, notFound, serverError } from "../../lib/http";
import { requireSession } from "../../lib/org";

export const profileRoutes = new Elysia({
  prefix: "/api/profile",
  tags: ["Profile"],
})
  .get("/", async ({ request, set }) => {
    const result = await requireSession(request.headers);
    if ("error" in result) return authError(set, result.error);

    try {
      const user = await prisma.user.findFirst({
        where: { id: result.session.user.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) return notFound(set, "User not found");

      return { user };
    } catch (error) {
      set.status = 500;
      return { message: "Failed to fetch profile" };
    }
  })
  .patch("/", async ({ request, set }) => {
    const result = await requireSession(request.headers);
    if ("error" in result) return authError(set, result.error);

    try {
      const body = await request.json();
      const { name, image } = body as { name?: string; image?: string | null };

      if (name !== undefined && typeof name === "string" && !name.trim()) {
        set.status = 400;
        return { message: "Name cannot be empty" };
      }

      const existing = await prisma.user.findUnique({
        where: { id: result.session.user.id },
        select: { name: true, image: true },
      });
      if (!existing) return notFound(set, "User not found");

      const user = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: result.session.user.id },
          data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(image !== undefined && { image: image || null }),
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
          },
        });
        const parserChanges = {
          ...(name !== undefined &&
            existing.name !== updated.name && {
              name: { from: existing.name, to: updated.name },
            }),
          ...(image !== undefined &&
            existing.image !== updated.image && {
              image: { from: existing.image, to: updated.image },
            }),
        };
        await logActivity(tx, {
          userId: result.session.user.id,
          action: "USER_UPDATED",
          metadata: {
            description: ActivityParser.profile.updated(parserChanges),
            entity: { type: "user", id: updated.id, name: updated.name },
            changes: [
              ...(parserChanges.name
                ? [
                    {
                      field: "name",
                      from: parserChanges.name.from,
                      to: parserChanges.name.to,
                    },
                  ]
                : []),
              ...(parserChanges.image
                ? [
                    {
                      field: "profileImage",
                      from: Boolean(parserChanges.image.from),
                      to: Boolean(parserChanges.image.to),
                    },
                  ]
                : []),
            ],
          },
        });
        return updated;
      });

      return { user };
    } catch (error) {
      return serverError(set, error);
    }
  });
