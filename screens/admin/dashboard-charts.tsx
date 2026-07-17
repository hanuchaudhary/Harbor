"use client";

import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Grid } from "@/components/dither-kit/grid";
import { Pie } from "@/components/dither-kit/pie";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlatformAnalytics } from "@/lib/analytics/types";

const throughputConfig = {
  tasksCreated: { label: "Created", color: "orange" as const },
  tasksCompleted: { label: "Completed", color: "green" as const },
};

const projectConfig = {
  active: { label: "Active", color: "green" as const },
  onHold: { label: "On hold", color: "orange" as const },
  completed: { label: "Completed", color: "blue" as const },
  archived: { label: "Archived", color: "grey" as const },
};

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
      colorClass: "bg-emerald-500",
    },
    {
      key: "onHold",
      name: "On hold",
      value: data.projects.onHold,
      colorClass: "bg-orange-500",
    },
    {
      key: "completed",
      name: "Completed",
      value: data.projects.completed,
      colorClass: "bg-blue-500",
    },
    {
      key: "archived",
      name: "Archived",
      value: data.projects.archived,
      colorClass: "bg-neutral-500",
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
        <AreaChart
          data={throughput}
          config={throughputConfig}
          bloom="aura"
          margins={{ top: 8, right: 8, bottom: 28, left: 34 }}
          className="h-56 w-full"
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
        <PieChart
          data={projects}
          config={projectConfig}
          dataKey="value"
          nameKey="key"
          innerRadius={0.58}
          bloom="aura"
          className="mx-auto h-48 w-full"
        >
          <Tooltip variant="frosted-glass" />
          <Pie variant="gradient" />
        </PieChart>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {projects.map((project) => (
            <div
              key={project.key}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={`size-2 ${project.colorClass}`} />
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
