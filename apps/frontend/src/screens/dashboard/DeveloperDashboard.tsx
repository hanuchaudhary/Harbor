"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  IconActivity,
  IconAlertTriangle,
  IconBrandAsana,
  IconBuildingBridge2,
  IconCheck,
  IconClock,
  IconBell,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";

import { dashboardApi, type DashboardStats } from "@/lib/api";
import { formatTaskTimeLogDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="border flex flex-col gap-3">
      <div className="flex items-center justify-between px-5 pt-5">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          {label}
        </span>
        <Icon className="size-4 stroke-1.5 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24 mx-5" />
      ) : (
        <span className="text-4xl font-montreal-medium px-5">{value}</span>
      )}
      {sub ? (
        <span className="text-xs text-muted-foreground px-5 pb-5">{sub}</span>
      ) : (
        <div className="pb-5" />
      )}
    </div>
  );
}

export function DeveloperDashboard() {
  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboard", "me"],
    queryFn: () => dashboardApi.get(),
  });

  const stats = data?.stats;
  const loading = isLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-montreal-medium">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your tasks, time, and projects at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/tracker">Open tracker</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/tracker/new">New task</Link>
          </Button>
        </div>
      </div>

      {isError && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Dashboard could not be loaded. Try refreshing the page.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Open Tasks"
          value={stats?.openTasks ?? 0}
          sub={`${stats?.overdueTasks ?? 0} overdue`}
          icon={IconBrandAsana}
          loading={loading}
        />
        <StatCard
          label="Completed"
          value={stats?.completedInPeriod ?? 0}
          sub={`last ${data?.range.days ?? 30} days`}
          icon={IconCheck}
          loading={loading}
        />
        <StatCard
          label="Hours Logged"
          value={formatTaskTimeLogDuration(stats?.secondsInPeriod ?? 0)}
          sub={`${formatTaskTimeLogDuration(stats?.totalSeconds ?? 0)} all time`}
          icon={IconClock}
          loading={loading}
        />
        <StatCard
          label="Active Projects"
          value={stats?.activeProjects ?? 0}
          sub={`${stats?.unreadNotifications ?? 0} unread notifications`}
          icon={IconBuildingBridge2}
          loading={loading}
        />
      </div>

      {data?.activeTimer && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <IconPlayerPlay className="size-5 stroke-1.5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-sm font-montreal-medium">Timer running</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.activeTimer.task.title} ·{" "}
                {data.activeTimer.task.project.name} · started{" "}
                {formatDistanceToNow(new Date(data.activeTimer.startedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/tracker/${data.activeTimer.task.id}`}>Open task</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="border">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-montreal-medium">Open tasks</h2>
            <Link
              to="/tracker"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data?.recentTasks.length ? (
            <ul className="divide-y">
              {data.recentTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to={`/tracker/${task.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.project.name}
                      </p>
                    </div>
                    <Badge variant="outline" size="sm">
                      {task.status.replace(/_/g, " ")}
                    </Badge>
                    {task.endDate &&
                      new Date(task.endDate) < new Date() && (
                        <IconAlertTriangle className="size-4 stroke-1.5 text-red-500 shrink-0" />
                      )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              No open tasks assigned to you.
            </p>
          )}
        </section>

        <section className="border">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-montreal-medium">Your projects</h2>
            <Link
              to="/projects"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data?.projects.length ? (
            <ul className="divide-y">
              {data.projects.map((project) => (
                <li key={project.id}>
                  <Link
                    to={`/projects/${project.slug}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <IconBuildingBridge2 className="size-4 stroke-1.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        /{project.slug}
                      </p>
                    </div>
                    <Badge variant="outline" size="sm">
                      {project.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              You are not on any active projects yet.
            </p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="border xl:col-span-1">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-montreal-medium">Tasks by status</h2>
          </div>
          <div className="p-5 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))
            ) : Object.keys(data?.tasksByStatus ?? {}).length ? (
              Object.entries(data!.tasksByStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="font-montreal-medium">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No task data yet.</p>
            )}
          </div>
          {(stats?.unreadNotifications ?? 0) > 0 && (
            <div className="border-t px-5 py-4">
              <Link
                to="/notifications"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <IconBell className="size-4 stroke-1.5" />
                {stats?.unreadNotifications} unread notifications
              </Link>
            </div>
          )}
        </section>

        <section className="border xl:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-montreal-medium">Recent activity</h2>
            <IconActivity className="size-4 stroke-1.5 text-muted-foreground" />
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.recentActivity.length ? (
            <ul className="divide-y">
              {data.recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="px-5 py-3 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      {item.action.replace(/_/g, " ").toLowerCase()}
                      {item.task ? (
                        <>
                          {" · "}
                          <Link
                            to={`/tracker/${item.task.id}`}
                            className="hover:underline"
                          >
                            {item.task.title}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    {item.project ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.project.name}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              No recent activity.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
