import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import { logActivity } from "../../lib/actions/activity";
import { auth } from "../../lib/auth";
import { serverError } from "../../lib/http";

export const tagRoutes = new Elysia({
  prefix: "/api/tags",
  tags: ["Tags"],
})
  .get("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    try {
      const tags = await prisma.tag.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true },
      });
      return { tags };
    } catch {
      set.status = 500;
      return { message: "Failed to fetch tags" };
    }
  })
  .post("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    try {
      const { name, color } = (await request.json()) as {
        name?: string;
        color?: string;
      };
      if (!name?.trim()) {
        set.status = 400;
        return { message: "Name is required" };
      }

      const tag = await prisma.$transaction(async (tx) => {
        const created = await tx.tag.create({
          data: { name: name.trim(), color: color || "#6366f1" },
          select: { id: true, name: true, color: true },
        });
        await logActivity(tx, {
          userId: session.user.id,
          action: "TAG_CREATED",
          metadata: {
            description: `Created tag '${created.name}'`,
            entity: { type: "tag", id: created.id, name: created.name },
          },
        });
        return created;
      });

      set.status = 201;
      return { tag };
    } catch {
      set.status = 500;
      return { message: "Failed to create tag" };
    }
  })
  .patch("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      set.status = 400;
      return { message: "Tag id is required" };
    }

    try {
      const { name, color } = (await request.json()) as {
        name?: string;
        color?: string;
      };
      if (!name?.trim()) {
        set.status = 400;
        return { message: "Name is required" };
      }

      const existing = await prisma.tag.findUnique({ where: { id } });
      if (!existing) {
        set.status = 404;
        return { message: "Tag not found" };
      }

      const tag = await prisma.$transaction(async (tx) => {
        const updated = await tx.tag.update({
          where: { id },
          data: { name: name.trim(), color },
          select: { id: true, name: true, color: true },
        });
        await logActivity(tx, {
          userId: session.user.id,
          action: "TAG_UPDATED",
          metadata: {
            description: `Updated tag '${updated.name}'`,
            entity: { type: "tag", id: updated.id, name: updated.name },
            changes: [
              ...(existing.name !== updated.name
                ? [{ field: "name", from: existing.name, to: updated.name }]
                : []),
              ...(existing.color !== updated.color
                ? [{ field: "color", from: existing.color, to: updated.color }]
                : []),
            ],
          },
        });
        return updated;
      });

      return { tag };
    } catch {
      set.status = 500;
      return { message: "Failed to update tag" };
    }
  })
  .delete("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      set.status = 400;
      return { message: "Tag id is required" };
    }

    try {
      const existing = await prisma.tag.findUnique({ where: { id } });
      if (!existing) {
        set.status = 404;
        return { message: "Tag not found" };
      }

      await prisma.$transaction(async (tx) => {
        await tx.tag.delete({ where: { id } });
        await logActivity(tx, {
          userId: session.user.id,
          action: "TAG_DELETED",
          metadata: {
            description: `Deleted tag '${existing.name}'`,
            entity: { type: "tag", id, name: existing.name },
          },
        });
      });

      return { success: true };
    } catch {
      set.status = 500;
      return { message: "Failed to delete tag" };
    }
  });
