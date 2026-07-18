"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  IconAlertCircle,
  IconLoader2,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { formatDate } from "@/lib/utils";
import axios from "axios";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserAvatar from "@/components/user-avatar";
import { ActivityTimelineItem } from "@/components/activity/activity-timeline-item";
import {
  ACTIVITY_CATEGORIES,
  formatActivity,
} from "@/lib/activity/activity-display";
import { Input } from "@/components/ui/input";

interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
  project: { id: string; name: string; slug: string } | null;
  task: { id: string; title: string } | null;
}

interface ActivityResponse {
  items: ActivityItem[];
  nextCursor: string | null;
  total: number;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

const ACTION_STYLES: Record<
  string,
  {
    variant:
      | "blue"
      | "indigo"
      | "purple"
      | "yellow"
      | "orange"
      | "emerald"
      | "red"
      | "secondary";
  }
> = {
  PROJECT: { variant: "blue" },
  TASK: { variant: "indigo" },
  COMMENT: { variant: "yellow" },
  SUBTASK: { variant: "orange" },
  ATTACHMENT: { variant: "emerald" },
  TIMELOG: { variant: "emerald" },
  ASSET: { variant: "purple" },
  DOC: { variant: "blue" },
  TAG: { variant: "secondary" },
  MENTION: { variant: "yellow" },
  INVITE: { variant: "red" },
  USER: { variant: "red" },
};

function getActionStyle(action: string) {
  const prefix = action.split("_")[0];
  const style = ACTION_STYLES[prefix] ?? { variant: "secondary" as const };
  const label = action.replace(`${prefix}_`, "").replace(/_/g, " ");
  return { variant: style.variant, label };
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <Skeleton className="h-3 w-28" />
            </div>
          </TableCell>
          <TableCell className="px-4 py-3">
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell className="px-4 py-3">
            <Skeleton className="h-3 w-24" />
          </TableCell>
          <TableCell className="px-4 py-3">
            <Skeleton className="h-3 w-32" />
          </TableCell>
          <TableCell className="px-4 py-3">
            <Skeleton className="h-3 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function ActivityTable({ initialUserId = "" }: { initialUserId?: string }) {
  const [category, setCategory] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [userId, setUserId] = useState<string>(initialUserId);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);

  const hasFilters =
    category || projectId || userId || from || to || debouncedSearch;

  const { data: projectsData } = useQuery<{ projects: ProjectOption[] }>({
    queryKey: ["admin-projects-list"],
    queryFn: () =>
      axios
        .get("/api/projects", { params: { limit: 200 } })
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const projects = projectsData?.projects ?? [];

  const { data: usersData } = useQuery<{ users: UserOption[] }>({
    queryKey: ["admin-members-list"],
    queryFn: () => axios.get("/api/members").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const users = usersData?.users ?? [];

  const filters = useMemo(
    () => ({ category, projectId, userId, from, to, debouncedSearch }),
    [category, projectId, userId, from, to, debouncedSearch],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useInfiniteQuery<ActivityResponse>({
    queryKey: ["admin-activity", filters],
    queryFn: ({ pageParam }) =>
      axios
        .get("/api/admin/activity", {
          params: {
            ...(pageParam ? { cursor: pageParam } : {}),
            ...(category && { category }),
            ...(projectId && { projectId }),
            ...(userId && { userId }),
            ...(debouncedSearch && { search: debouncedSearch }),
            ...(from && { from: from.toISOString() }),
            ...(to && {
              to: new Date(
                to.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000,
              ).toISOString(),
            }),
          },
        })
        .then((r) => r.data),
    initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  function clearFilters() {
    setCategory("");
    setProjectId("");
    setUserId("");
    setFrom(undefined);
    setTo(undefined);
    setSearch("");
    setDebouncedSearch("");
  }

  return (
    <div id="activity-log" className="scroll-mt-6">
      <div className="py-4 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-montreal-medium">Activity Log</p>
            <p
              className="text-xs text-muted-foreground mt-0.5"
              aria-live="polite"
            >
              {isLoading ? (
                "Loading..."
              ) : (
                <>
                  {allItems.length} of {total} entries
                </>
              )}
            </p>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-8 gap-1 text-muted-foreground"
            >
              <IconX className="size-3" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 md:max-w-72">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people, projects, tasks…"
              aria-label="Search activity"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select
            value={category || "_all"}
            onValueChange={(v) => setCategory(v === "_all" ? "" : v)}
          >
            <SelectTrigger
              size="sm"
              className="w-36 h-8 text-xs"
              aria-label="Filter by category"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All categories</SelectItem>
              {ACTIVITY_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={projectId || "_all"}
            onValueChange={(v) => setProjectId(v === "_all" ? "" : v)}
          >
            <SelectTrigger
              size="sm"
              className="w-44 h-8 text-xs"
              aria-label="Filter by project"
            >
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={userId || "_all"}
            onValueChange={(v) => setUserId(v === "_all" ? "" : v)}
          >
            <SelectTrigger
              size="sm"
              className="w-44 h-8 text-xs"
              aria-label="Filter by user"
            >
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">From</span>
            <DatePicker
              date={from}
              onDateChange={setFrom}
              placeholder="Select date"
              buttonVariant="outline"
              dateFormat="MMM dd, yyyy"
              buttonClassName="h-8 text-xs w-32"
              iconClassName="mr-1 h-3 w-3"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">To</span>
            <DatePicker
              date={to}
              onDateChange={setTo}
              placeholder="Select date"
              buttonVariant="outline"
              dateFormat="MMM dd, yyyy"
              buttonClassName="h-8 text-xs w-32"
              iconClassName="mr-1 h-3 w-3"
            />
          </div>

          {isFetching && !isLoading && (
            <IconLoader2
              className="size-4 animate-spin text-muted-foreground ml-1"
              aria-label="Refreshing activity"
            />
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <Table className="border">
        <TableHeader>
          <TableRow className="bg-accent/30">
            <TableHead className="w-48">User</TableHead>
            <TableHead className="w-44">Action</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Task</TableHead>
            <TableHead className="w-36">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeleton />}

          {!isLoading && isError && (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                  <IconAlertCircle className="size-5" />
                  <span>Activity could not be loaded.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                  >
                    Try again
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && allItems.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                No activity found
              </TableCell>
            </TableRow>
          )}

          {allItems.map((item) => {
            const { variant } = getActionStyle(item.action);
            const display = formatActivity(item.action, item.metadata);
            const date = new Date(item.createdAt);

            return (
              <TableRow key={item.id}>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      src={item.user.image ?? ""}
                      alt={item.user.name}
                    />
                    <span className="text-xs font-medium truncate max-w-32">
                      {item.user.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex max-w-80 flex-col gap-1">
                    <Badge
                      variant={variant}
                      className="text-[10px] py-0 h-5 w-fit"
                    >
                      {display.actionLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {display.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  {item.project ? (
                    <Link
                      href={`/projects/${item.project.slug}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                    >
                      {item.project.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  {item.task && item.project ? (
                    <Link
                      href={`/projects/${item.project.slug}/tracker/${item.task.id}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline truncate block max-w-48"
                      title={item.task.title}
                    >
                      {item.task.title}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(date, { addSuffix: true })}
                    </span>
                    <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap">
                      {formatDate(date, "timeOnly")}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>

      <div className="divide-y md:hidden">
        {isLoading &&
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="p-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        {!isLoading && isError && (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <IconAlertCircle className="size-5" />
            <span>Activity could not be loaded.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}
        {!isLoading && !isError && allItems.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No activity found
          </p>
        )}
        {allItems.map((item) => (
          <div key={item.id} className="p-3">
            <ActivityTimelineItem activity={item} showChanges={false} />
          </div>
        ))}
      </div>

      {(hasNextPage || isFetchingNextPage) && (
        <div className="px-5 py-4 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Showing {allItems.length} of {total}
          </span>
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="h-8 text-xs gap-2"
          >
            {isFetchingNextPage && (
              <IconLoader2 className="size-3.5 animate-spin" />
            )}
            Load more
          </Button>
        </div>
      )}

      {!hasNextPage && allItems.length > 0 && (
        <div className="px-5 py-3 border-t">
          <span className="text-xs text-muted-foreground">
            Showing all {allItems.length} entries
          </span>
        </div>
      )}
    </div>
  );
}
