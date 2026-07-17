"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconBuildingBridge2,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import axios from "axios";
import { useState } from "react";

import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import { Grid } from "@/components/dither-kit/grid";
import { Pie } from "@/components/dither-kit/pie";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "@/components/user-avatar";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  type PlatformAnalytics,
} from "@/lib/analytics/types";
import { cn, formatTaskTimeLogDuration } from "@/lib/utils";

const throughputConfig = {
  tasksCreated: { label: "Tasks created", color: "orange" as const },
  tasksCompleted: { label: "Tasks completed", color: "green" as const },
};

const hoursConfig = {
  hours: { label: "Hours logged", color: "pink" as const },
};

const projectConfig = {
  active: { label: "Active", color: "green" as const },
  onHold: { label: "On hold", color: "orange" as const },
  completed: { label: "Completed", color: "blue" as const },
  archived: { label: "Archived", color: "grey" as const },
};

const workloadConfig = {
  openTasks: { label: "Open tasks", color: "orange" as const },
  completedTasks: { label: "Completed", color: "green" as const },
};

function Metric({
  label,
  value,
  note,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="border p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 stroke-1.5 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="mt-5 h-9 w-24" />
      ) : (
        <p className="mt-5 text-3xl font-montreal-medium tabular-nums">
          {value}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function ChartShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border p-5", className)}>
      <div className="mb-5">
        <h2 className="font-montreal-medium">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 items-center justify-center border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function AnalyticsScreen() {
  const [range, setRange] = useState<AnalyticsRange>(30);
  const { data, isLoading, isFetching, isError } = useQuery<PlatformAnalytics>({
    queryKey: ["admin-analytics", range],
    queryFn: () =>
      axios
        .get(`/api/admin/analytics?range=${range}`)
        .then((response) => response.data),
    placeholderData: keepPreviousData,
  });

  const timeSeries =
    data?.series.map((point) => ({
      ...point,
      label: new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      hours: +(point.secondsLogged / 3600).toFixed(1),
    })) ?? [];
  const projectData = data
    ? [
        {
          key: "active",
          name: "Active",
          value: data.projects.active,
        },
        {
          key: "onHold",
          name: "On hold",
          value: data.projects.onHold,
        },
        {
          key: "completed",
          name: "Completed",
          value: data.projects.completed,
        },
        {
          key: "archived",
          name: "Archived",
          value: data.projects.archived,
        },
      ]
    : [];
  const workload = (data?.workload ?? []).slice(0, 8).map((member) => ({
    ...member,
    shortName: member.name.split(" ")[0],
  }));
  const hasThroughput = timeSeries.some(
    (point) => point.tasksCreated > 0 || point.tasksCompleted > 0,
  );
  const hasHours = timeSeries.some((point) => point.hours > 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 font-montreal-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Delivery intelligence
          </p>
          <h1 className="text-2xl font-montreal-medium">Analytics</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Throughput, time investment, portfolio health, and team workload in
            one operational view.
          </p>
        </div>
        <div
          className="flex w-fit border p-1"
          aria-label="Analytics date range"
        >
          {ANALYTICS_RANGES.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRange(days)}
              className={cn(
                "px-3 py-1.5 font-montreal-mono text-[11px] uppercase tracking-wider transition-colors",
                range === days
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {days}D
            </button>
          ))}
        </div>
      </header>

      {isError && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Analytics could not be loaded. Check your access and try again.
        </div>
      )}

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 xl:grid-cols-4 transition-opacity",
          isFetching && !isLoading && "opacity-60",
        )}
      >
        <Metric
          label="Active projects"
          value={data?.projects.active ?? 0}
          note={`${data?.projects.createdInPeriod ?? 0} started this period`}
          icon={IconBuildingBridge2}
          loading={isLoading}
        />
        <Metric
          label="Tasks completed"
          value={data?.tasks.completedInPeriod ?? 0}
          note={`${data?.tasks.completionRate ?? 0}% completion rate`}
          icon={IconCheck}
          loading={isLoading}
        />
        <Metric
          label="Overdue tasks"
          value={data?.tasks.overdue ?? 0}
          note={`${data?.tasks.open ?? 0} open across the portfolio`}
          icon={IconAlertTriangle}
          loading={isLoading}
        />
        <Metric
          label="Hours logged"
          value={formatTaskTimeLogDuration(data?.time.secondsInPeriod ?? 0)}
          note={`Across the last ${range} days`}
          icon={IconClock}
          loading={isLoading}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-80" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <ChartShell
              title="Task throughput"
              description="Daily task intake versus completed work"
            >
              {!hasThroughput ? (
                <EmptyChart message="No task activity in this period." />
              ) : (
                <AreaChart
                  data={timeSeries}
                  config={throughputConfig}
                  bloom="aura"
                  margins={{ top: 8, right: 8, bottom: 28, left: 34 }}
                  className="h-72 w-full"
                >
                  <Grid />
                  <XAxis dataKey="label" maxTicks={7} />
                  <YAxis tickCount={4} />
                  <Tooltip labelKey="label" variant="frosted-glass" />
                  <Area
                    dataKey="tasksCreated"
                    variant="dotted"
                    isClickable
                  />
                  <Area
                    dataKey="tasksCompleted"
                    variant="gradient"
                    isClickable
                  />
                </AreaChart>
              )}
            </ChartShell>

            <ChartShell
              title="Time investment"
              description="Hours recorded by the team each day"
            >
              {!hasHours ? (
                <EmptyChart message="No time has been logged in this period." />
              ) : (
                <BarChart
                  data={timeSeries}
                  config={hoursConfig}
                  bloom="aura"
                  margins={{ top: 8, right: 8, bottom: 28, left: 34 }}
                  className="h-72 w-full"
                >
                  <Grid />
                  <XAxis dataKey="label" maxTicks={7} />
                  <YAxis
                    tickCount={4}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip
                    labelKey="label"
                    valueFormatter={(value) => `${value.toFixed(1)}h`}
                    variant="frosted-glass"
                  />
                  <Bar dataKey="hours" variant="gradient" />
                </BarChart>
              )}
            </ChartShell>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.4fr]">
            <ChartShell
              title="Project health"
              description="Current status of the complete portfolio"
            >
              {data.projects.total === 0 ? (
                <div className="flex h-56 items-center justify-center border border-dashed text-sm text-muted-foreground">
                  No projects to display.
                </div>
              ) : (
                <PieChart
                  data={projectData}
                  config={projectConfig}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={0.58}
                  bloom="aura"
                  className="mx-auto h-56 w-full"
                >
                  <Tooltip variant="frosted-glass" />
                  <Pie variant="gradient" />
                </PieChart>
              )}
              <div className="grid grid-cols-2 gap-2">
                {projectData.map((project) => (
                  <div
                    key={project.key}
                    className="flex items-center justify-between border-t pt-2 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {project.name}
                    </span>
                    <span className="font-montreal-mono">{project.value}</span>
                  </div>
                ))}
              </div>
            </ChartShell>

            <ChartShell
              title="Team workload"
              description="Open assignments and completions in this period"
            >
              {workload.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No assignments in this period.
                </div>
              ) : (
                <>
                  <BarChart
                    data={workload}
                    config={workloadConfig}
                    bloom="aura"
                    margins={{ top: 8, right: 8, bottom: 28, left: 34 }}
                    className="h-56 w-full"
                  >
                    <Grid />
                    <XAxis dataKey="shortName" maxTicks={8} />
                    <YAxis tickCount={4} />
                    <Tooltip labelKey="shortName" variant="frosted-glass" />
                    <Bar dataKey="openTasks" variant="dotted" isClickable />
                    <Bar
                      dataKey="completedTasks"
                      variant="gradient"
                      isClickable
                    />
                  </BarChart>
                  <div className="mt-4 divide-y border-t">
                    {workload.slice(0, 5).map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between py-2.5 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <UserAvatar
                            src={member.image ?? ""}
                            alt={member.name}
                          />
                          {member.name}
                        </span>
                        <span className="font-montreal-mono text-muted-foreground">
                          {formatTaskTimeLogDuration(member.secondsLogged)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ChartShell>
          </div>
        </>
      ) : null}
    </div>
  );
}
