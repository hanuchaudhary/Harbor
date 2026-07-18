import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { TIMER_HEARTBEAT_STALE_AFTER_MS } from "@/lib/timer";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const staleBefore = new Date(
    now.getTime() - TIMER_HEARTBEAT_STALE_AFTER_MS,
  );

  try {
    const staleTimers = await prisma.timeLog.findMany({
      where: {
        isRunning: true,
        lastHeartbeatAt: { lt: staleBefore },
      },
      select: {
        id: true,
        lastHeartbeatAt: true,
        note: true,
      },
    });

    let finalizedCount = 0;
    for (const timer of staleTimers) {
      if (!timer.lastHeartbeatAt) continue;

      const result = await prisma.timeLog.updateMany({
        where: {
          id: timer.id,
          isRunning: true,
          lastHeartbeatAt: timer.lastHeartbeatAt,
        },
        data: {
          isRunning: false,
          endedAt: timer.lastHeartbeatAt,
          note: timer.note || "Automatically stopped when the app was closed",
        },
      });
      finalizedCount += result.count;
    }

    const runningTimers = await prisma.timeLog.findMany({
      where: {
        userId: session.user.id,
        isRunning: true,
      },
      select: {
        id: true,
        duration: true,
        startedAt: true,
        lastHeartbeatAt: true,
        note: true,
      },
    });

    let checkpointedCount = 0;
    for (const timer of runningTimers) {
      const checkpoint = timer.lastHeartbeatAt ?? timer.startedAt;
      if (!checkpoint) continue;

      const elapsedMs = now.getTime() - checkpoint.getTime();
      if (elapsedMs > TIMER_HEARTBEAT_STALE_AFTER_MS) {
        const result = await prisma.timeLog.updateMany({
          where: {
            id: timer.id,
            isRunning: true,
            lastHeartbeatAt: timer.lastHeartbeatAt,
          },
          data: {
            isRunning: false,
            endedAt: checkpoint,
            note:
              timer.note || "Automatically stopped when the app was closed",
          },
        });
        finalizedCount += result.count;
        continue;
      }

      const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
      const result = await prisma.timeLog.updateMany({
        where: {
          id: timer.id,
          isRunning: true,
          duration: timer.duration,
          lastHeartbeatAt: timer.lastHeartbeatAt,
        },
        data: {
          duration: { increment: elapsedSeconds },
          lastHeartbeatAt: now,
        },
      });
      checkpointedCount += result.count;
    }

    return NextResponse.json({
      checkpointedCount,
      finalizedCount,
      checkpointedAt: now,
    });
  } catch (error) {
    console.error("Failed to checkpoint timers:", error);
    return NextResponse.json(
      { message: "Failed to checkpoint timers" },
      { status: 500 },
    );
  }
}
