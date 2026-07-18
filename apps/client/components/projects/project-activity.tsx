"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";

import { ActivityTimelineItem } from "@/components/activity/activity-timeline-item";
import { Button } from "@/components/ui/button";
import { ActivityLogQueries } from "@/lib/query/query.func";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityLog } from "@/types/types";

interface ProjectActivityProps {
  projectSlug: string;
}

export function ProjectActivity({ projectSlug }: ProjectActivityProps) {
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ActivityLogQueries.keys.byProject(projectSlug),
    queryFn: ({ pageParam }) =>
      ActivityLogQueries.fetchByProject(
        projectSlug,
        pageParam as string | undefined,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <IconAlertCircle className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Activity could not be loaded.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const activityLogs = (data?.pages.flatMap(
    (page) => page.activityLogs,
  ) || []) as ActivityLog[];

  if (activityLogs.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div>
      <ul className="relative space-y-1 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-border">
        {activityLogs.map((log) => (
          <li key={log.id}>
            <ActivityTimelineItem activity={log} />
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <div className="mt-4 flex justify-center border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && (
              <IconLoader2 className="mr-2 size-3.5 animate-spin" />
            )}
            Load older activity
          </Button>
        </div>
      )}
    </div>
  );
}
