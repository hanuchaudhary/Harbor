"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth.client";
import { TimeLogQueries } from "@/lib/query/query.func";
import { TimeLog } from "@/types/types";

export function useRunningTimer() {
  const { useSession } = authClient;
  const { data: session } = useSession();

  const { data: runningTimers = [] as TimeLog[], isLoading } = useQuery({
    queryKey: TimeLogQueries.keys.active(),
    queryFn: TimeLogQueries.fetchActiveTimers,
    enabled: !!session?.user,
    refetchInterval: 60000 * 1,
    refetchOnWindowFocus: true,
  });

  return {
    runningTimers,
    isLoading,
  };
}
