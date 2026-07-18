import { NextRequest, NextResponse } from "next/server";

import prisma from "@repo/db";
import type { Role } from "@repo/db/enums";
import {
  isOrgAdmin,
  requireActiveMembership,
} from "@/lib/auth/org";

const allowedRoles: Role[] = [
  "ADMIN",
  "PARTNER",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "CLIENT",
];

export async function GET(request: NextRequest) {
  const membership = await requireActiveMembership();

  if ("error" in membership) {
    return NextResponse.json(
      { message: membership.error.message },
      { status: membership.error.status },
    );
  }

  if (!isOrgAdmin(membership.memberRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const normalizedRole =
      role && allowedRoles.includes(role as Role) ? (role as Role) : undefined;
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

    return NextResponse.json(
      {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
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
