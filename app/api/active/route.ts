import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const inactiveTimers = await prisma.timeLog.findMany({
    where: {
      isRunning: true,
      user: {
        lastSeenAt: {
          lt: fiveMinutesAgo,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          lastSeenAt: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // console.log(inactiveTimers);

  if (inactiveTimers.length > 0) {
    for (const timer of inactiveTimers) {
      const lastSeenTime = timer.user.lastSeenAt
        ? new Date(timer.user.lastSeenAt).getTime()
        : now.getTime();
      const startTime = timer.startedAt
        ? new Date(timer.startedAt).getTime()
        : lastSeenTime;
      const elapsedSeconds = Math.floor((lastSeenTime - startTime) / 1000);
      const totalDuration = timer.duration + elapsedSeconds;
      // console.log("total duration: ", totalDuration);

      await prisma.timeLog.update({
        where: { id: timer.id },
        data: {
          isRunning: false,
          endedAt: timer.user.lastSeenAt || now,
          duration: totalDuration,
          note: "Automatically stopped due to inactivity",
        },
      });
    }
  }

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

export async function GET(req: Request) {
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
