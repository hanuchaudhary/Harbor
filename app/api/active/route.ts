import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      lastSeenAt: now,
    },
  });

  return NextResponse.json({
    health: "ok",
    lastSeenAt: updatedUser.lastSeenAt,
  });
}

export async function GET(_req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeUsers = await prisma.user.findMany({
    where: {
      lastSeenAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastSeenAt: true,
    },
    orderBy: {
      lastSeenAt: "desc",
    },
  });

  return NextResponse.json({ activeUsers });
}
