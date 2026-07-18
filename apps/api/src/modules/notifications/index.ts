import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import { auth } from "../../lib/auth";
import { notFound } from "../../lib/http";

export const notificationRoutes = new Elysia({
  prefix: "/api/notifications",
  tags: ["Notifications"],
})
  .get("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: session.user.id,
          ...(unreadOnly && { read: false }),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return { notifications, unreadCount };
  })
  .patch("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });

    return { message: "All notifications marked as read" };
  })
  .delete("/", async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    await prisma.notification.deleteMany({
      where: { userId: session.user.id, read: true },
    });

    return { message: "Read notifications cleared" };
  })
  .patch("/:id", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const notification = await prisma.notification.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!notification) return notFound(set, "Notification not found");

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { read: true },
    });

    return { notification: updated };
  })
  .delete("/:id", async ({ request, params, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const notification = await prisma.notification.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!notification) return notFound(set, "Notification not found");

    await prisma.notification.delete({ where: { id: params.id } });

    return { message: "Notification deleted" };
  });
