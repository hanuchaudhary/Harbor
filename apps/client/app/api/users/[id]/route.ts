import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import type { Role } from "@repo/db/enums";
import { logActivity } from "@/lib/actions/activity";

type Params = {
  params: Promise<{ id: string }>;
};

const allowedRoles: Role[] = [
  "ADMIN",
  "PARTNER",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "CLIENT",
] as const;

const isRole = (value: unknown): value is Role =>
  typeof value === "string" && allowedRoles.includes(value as Role);

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const role = isRole(body.role) ? body.role : undefined;
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : undefined;

    if (role === undefined && isActive === undefined) {
      return NextResponse.json(
        { message: "No valid fields provided" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, role: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
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

    return NextResponse.json(
      { message: "User updated successfully", user: updatedUser },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (session.user.id === id) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 400 },
      );
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

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
