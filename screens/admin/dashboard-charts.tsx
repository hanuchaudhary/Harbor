"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlatformAnalytics } from "@/lib/analytics/types";

const throughputConfig = {
  tasksCreated: { label: "Created", color: "var(--chart-2)" },
  tasksCompleted: { label: "Completed", color: "var(--chart-1)" },
} satisfies ChartConfig;

const projectConfig = {
  active: { label: "Active", color: "var(--chart-1)" },
  onHold: { label: "On hold", color: "var(--chart-4)" },
  completed: { label: "Completed", color: "var(--chart-2)" },
  archived: { label: "Archived", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

export function DashboardCharts({
  data,
  loading,
}: {
  data: PlatformAnalytics | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!data) return null;

  const throughput = data.series.map((point) => ({
    ...point,
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));
  const projects = [
    {
      key: "active",
      name: "Active",
      value: data.projects.active,
      fill: "var(--color-active)",
    },
    {
      key: "onHold",
      name: "On hold",
      value: data.projects.onHold,
      fill: "var(--color-onHold)",
    },
    {
      key: "completed",
      name: "Completed",
      value: data.projects.completed,
      fill: "var(--color-completed)",
    },
    {
      key: "archived",
      name: "Archived",
      value: data.projects.archived,
      fill: "var(--color-archived)",
    },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
      <div className="border p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-montreal-medium">Task throughput</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Work opened and shipped over the last {data.range.days} days
            </p>
          </div>
          <span className="font-montreal-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Daily
          </span>
        </div>
        <ChartContainer config={throughputConfig} className="h-56 w-full">
          <AreaChart data={throughput} margin={{ left: -24, right: 8 }}>
            <defs>
              <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tasksCreated)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tasksCreated)"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tasksCompleted)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tasksCompleted)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="tasksCreated"
              stroke="var(--color-tasksCreated)"
              fill="url(#createdFill)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="tasksCompleted"
              stroke="var(--color-tasksCompleted)"
              fill="url(#completedFill)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
          <span>{data.tasks.createdInPeriod} created</span>
          <span>{data.tasks.completedInPeriod} completed</span>
          <span>{data.tasks.overdue} overdue</span>
        </div>
      </div>

      <div className="border p-5">
        <div>
          <h2 className="font-montreal-medium">Project health</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current portfolio distribution
          </p>
        </div>
        <ChartContainer config={projectConfig} className="mx-auto h-48 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={projects}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
            >
              {projects.map((project) => (
                <Cell key={project.key} fill={project.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {projects.map((project) => (
            <div
              key={project.key}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="size-2"
                  style={{ backgroundColor: project.fill }}
                />
                {project.name}
              </span>
              <span className="font-montreal-mono">{project.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
