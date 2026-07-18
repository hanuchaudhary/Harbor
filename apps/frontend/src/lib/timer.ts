export const TIMER_HEARTBEAT_INTERVAL_MS = 60_000;
export const TIMER_HEARTBEAT_STALE_AFTER_MS = 150_000;

type TimerSnapshot = {
  duration: number;
  isRunning: boolean;
  lastHeartbeatAt: string | Date | null;
};

export function getLiveTimerDuration(
  timer: TimerSnapshot,
  now = Date.now(),
): number {
  if (!timer.isRunning || !timer.lastHeartbeatAt) {
    return timer.duration;
  }

  const checkpoint = new Date(timer.lastHeartbeatAt).getTime();
  const elapsed = now - checkpoint;

  if (
    !Number.isFinite(checkpoint) ||
    elapsed <= 0 ||
    elapsed > TIMER_HEARTBEAT_STALE_AFTER_MS
  ) {
    return timer.duration;
  }

  return timer.duration + Math.floor(elapsed / 1000);
}
