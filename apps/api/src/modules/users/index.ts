import { Elysia } from "elysia";
import { prisma } from "@repo/db";
import type { Role } from "@repo/db/enums";

import { logActivity } from "../../lib/actions/activity";
import { auth } from "../../lib/auth";
import { isOrgAdmin, requireActiveMembership } from "../../lib/org";

const allowedRoles: Role[] = [
  "ADMIN",
  "PARTNER",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "CLIENT",
];

const isRole = (value: unknown): value is Role =>
  typeof value === "string" && allowedRoles.includes(value as Role);

export const userRoutes = new Elysia({
  prefix: "/api/users",
  tags: ["Users"],
})
  .get("/", async ({ request, set, query }) => {
    const membership = await requireActiveMembership(request.headers);

    if ("error" in membership) {
      set.status = membership.error.status;
      return { message: membership.error.message };
    }

    if (!isOrgAdmin(membership.memberRole)) {
      set.status = 403;
      return { message: "Forbidden" };
    }

    try {
      const page = parseInt(String(query.page || "1"));
      const limit = parseInt(String(query.limit || "10"));
      const search = String(query.search || "");
      const role = String(query.role || "");
      const normalizedRole =
        role && allowedRoles.includes(role as Role)
          ? (role as Role)
          : undefined;
      const skip = (page - 1) * limit;

      const memberWhere = {
        organizationId: membership.organizationId,
        ...(normalizedRole && { role: normalizedRole }),
        user: {
          deletedAt: null,
          ...(search && {
            OR: [
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }),
        },
      };

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where: memberWhere,
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                isActive: true,
                createdAt: true,
                _count: {
                  select: {
                    projectMembers: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.member.count({ where: memberWhere }),
      ]);

      const users = members.map((member) => ({
        ...member.user,
        role: member.role,
      }));

      return {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { message: "Internal server error" };
    }
  })
  .patch("/:id", async ({ request, set, params, body }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    if (session.user.role !== "ADMIN") {
      set.status = 403;
      return { message: "Forbidden" };
    }

    try {
      const { id } = params;
      const payload = body as { role?: unknown; isActive?: unknown };

      const role = isRole(payload.role) ? payload.role : undefined;
      const isActive =
        typeof payload.isActive === "boolean" ? payload.isActive : undefined;

      if (role === undefined && isActive === undefined) {
        set.status = 400;
        return { message: "No valid fields provided" };
      }

      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, name: true, role: true, isActive: true },
      });

      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      const updatedUser = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id },
          data: {
            ...(role !== undefined && { role }),
            ...(isActive !== undefined && { isActive }),
          },
          select: {
            id: true,
            name: true,
            role: true,
            isActive: true,
          },
        });
        const action =
          isActive !== undefined && isActive !== user.isActive
            ? isActive
              ? "USER_REACTIVATED"
              : "USER_DEACTIVATED"
            : "USER_UPDATED";
        const changes = [
          ...(role !== undefined && role !== user.role
            ? [{ field: "role", from: user.role, to: role }]
            : []),
          ...(isActive !== undefined && isActive !== user.isActive
            ? [
                {
                  field: "status",
                  from: user.isActive ? "active" : "inactive",
                  to: isActive ? "active" : "inactive",
                },
              ]
            : []),
        ];
        await logActivity(tx, {
          userId: session.user.id,
          action,
          metadata: {
            description:
              action === "USER_UPDATED"
                ? `Updated '${user.name}' role from ${user.role.toLowerCase()} to ${updated.role.toLowerCase()}`
                : `${updated.isActive ? "Reactivated" : "Deactivated"} user '${user.name}'`,
            entity: { type: "user", id: user.id, name: user.name },
            target: { type: "user", id: user.id, name: user.name },
            changes,
          },
        });
        return updated;
      });

      return { message: "User updated successfully", user: updatedUser };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { message: "Internal server error" };
    }
  })
  .delete("/:id", async ({ request, set, params }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    if (session.user.role !== "ADMIN") {
      set.status = 403;
      return { message: "Forbidden" };
    }

    try {
      const { id } = params;

      const user = await prisma.user.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, name: true },
      });

      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      if (session.user.id === id) {
        set.status = 400;
        return { message: "You cannot delete your own account" };
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            isActive: false,
          },
        });
        await logActivity(tx, {
          userId: session.user.id,
          action: "USER_DEACTIVATED",
          metadata: {
            description: `Deactivated user '${user.name}'`,
            entity: { type: "user", id: user.id, name: user.name },
            target: { type: "user", id: user.id, name: user.name },
            changes: [{ field: "status", from: "active", to: "deactivated" }],
          },
        });
      });

      return { message: "User deleted successfully" };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { message: "Internal server error" };
    }
  });
