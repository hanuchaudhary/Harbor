import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timers = await prisma.timeLog.findMany({
    where: {
      userId: session.user.id,
      isRunning: true,
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      startedAt: "asc",
    },
  });

  return NextResponse.json({ timers });
}
