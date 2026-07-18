"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { TIMER_HEARTBEAT_INTERVAL_MS } from "@/lib/timer";

export function useTimerHeartbeat(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const checkpointTimers = async () => {
      try {
        const response = await fetch("/api/timelogs/heartbeat", {
          method: "POST",
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(`Timer heartbeat failed with ${response.status}`);
        }
        if (active) {
          await queryClient.invalidateQueries({ queryKey: ["timelogs"] });
        }
      } catch (error) {
        console.error("Failed to checkpoint running timers:", error);
      }
    };

    const checkpointBeforeClose = () => {
      navigator.sendBeacon("/api/timelogs/heartbeat");
    };

    void checkpointTimers();
    const interval = window.setInterval(
      checkpointTimers,
      TIMER_HEARTBEAT_INTERVAL_MS,
    );
    window.addEventListener("pagehide", checkpointBeforeClose);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("pagehide", checkpointBeforeClose);
    };
  }, [enabled, queryClient]);
}
