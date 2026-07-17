"use client";

import {
  IconActivity,
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconBuildingBridge2,
  IconCheck,
  IconClock,
  IconMinus,
  IconUsers,
} from "@tabler/icons-react";

import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import type { DitherColor } from "@/components/dither-kit/palette";
import { Pie } from "@/components/dither-kit/pie";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Sparkline } from "@/components/dither-kit/sparkline";
import { XAxis } from "@/components/dither-kit/x-axis";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTaskTimeLogDuration } from "@/lib/utils";

export interface Analytics {
  projects: {
    total: number;
    active: number;
    onHold: number;
    completed: number;
    archived: number;
  };
  tasks: {
    total: number;
    open: number;
    completed: number;
    overdue: number;
    completedThisMonth: number;
    completedLastMonth: number;
    completionChange: number | null;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  totalTimeLogged: number;
}

/** Dummy spark series for card chrome — not wired to analytics. */
const SPARK = {
  projects: [4, 6, 5, 8, 7, 9, 11, 10, 12, 14],
  tasks: [18, 22, 19, 25, 28, 24, 30, 27, 32, 29],
  completed: [2, 5, 4, 8, 6, 10, 9, 12, 11, 14],
  overdue: [6, 5, 7, 4, 5, 3, 4, 2, 3, 2],
  users: [8, 9, 11, 12, 14, 15, 16, 18, 19, 21],
} as const;

const HOURS_BARS = [
  { day: "M", hours: 12 },
  { day: "T", hours: 18 },
  { day: "W", hours: 15 },
  { day: "T", hours: 22 },
  { day: "F", hours: 19 },
  { day: "S", hours: 8 },
  { day: "S", hours: 5 },
];

function StatCard({
  label,
  value,
  sub,
  change,
  icon: Icon,
  loading,
  chart,
}: {
  label: string;
  value: number | string;
  sub?: string;
  change?: number | null;
  icon: React.ElementType;
  loading: boolean;
  chart?: React.ReactNode;
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
        <Skeleton className="h-8 w-24" />
      ) : (
        <span className="text-3xl font-montreal-medium px-5 pb-5">{value}</span>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-5 pb-5">
        {sub && <span>{sub}</span>}
        {change != null && (
          <span
            className={cn(
              "flex items-center gap-0.5",
              change > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : change < 0
                  ? "text-red-500"
                  : "",
            )}
          >
            {change > 0 ? (
              <IconArrowUp className="size-3 stroke-1" />
            ) : change < 0 ? (
              <IconArrowDown className="size-3 stroke-1" />
            ) : (
              <IconMinus className="size-3 stroke-1" />
            )}
            {Math.abs(change)}% vs last month
          </span>
        )}
      </div>
      {chart && <div className="h-14 w-full mt-1">{chart}</div>}
    </div>
  );
}

function CardSparkline({
  data,
  color,
  bloom = "aura",
  variant = "gradient",
}: {
  data: readonly number[];
  color: DitherColor;
  bloom?: "off" | "low" | "high" | "aura";
  variant?: "gradient" | "dotted" | "hatched" | "solid";
}) {
  return (
    <Sparkline
      data={[...data]}
      color={color}
      variant={variant}
      bloom={bloom}
      animate
      className="h-full w-full"
    />
  );
}

export function StatCards({
  data,
  loading,
}: {
  data: Analytics | undefined;
  loading: boolean;
}) {
  const a = data;

  const projectStatusData = [
    { key: "active", value: a?.projects.active ?? 0 },
    { key: "onHold", value: a?.projects.onHold ?? 0 },
    { key: "completed", value: a?.projects.completed ?? 0 },
    { key: "archived", value: a?.projects.archived ?? 0 },
  ];

  const projectStatusConfig = {
    active: { label: "Active", color: "green" as const },
    onHold: { label: "On Hold", color: "orange" as const },
    completed: { label: "Completed", color: "blue" as const },
    archived: { label: "Archived", color: "grey" as const },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Active Projects"
        value={a?.projects.active ?? 0}
        sub={`${a?.projects.total ?? 0} total`}
        icon={IconBuildingBridge2}
        loading={loading}
        chart={
          <CardSparkline data={SPARK.projects} color="blue" bloom="aura" />
        }
      />
      <StatCard
        label="Open Tasks"
        value={a?.tasks.open ?? 0}
        sub={`${a?.tasks.total ?? 0} total`}
        icon={IconActivity}
        loading={loading}
        chart={
          <CardSparkline
            data={SPARK.tasks}
            color="orange"
            bloom="high"
            variant="dotted"
          />
        }
      />
      <StatCard
        label="Completed This Month"
        value={a?.tasks.completedThisMonth ?? 0}
        change={a?.tasks.completionChange ?? null}
        icon={IconCheck}
        loading={loading}
        chart={
          <AreaChart
            data={SPARK.completed.map((v, i) => ({ i, done: v }))}
            config={{ done: { label: "Done", color: "green" } }}
            bloom="aura"
            interactive={false}
            margins={{ top: 2, right: 0, bottom: 0, left: 0 }}
            className="h-full w-full"
          >
            <Area dataKey="done" variant="gradient" />
          </AreaChart>
        }
      />
      <StatCard
        label="Overdue Tasks"
        value={a?.tasks.overdue ?? 0}
        sub="past deadline"
        icon={IconAlertTriangle}
        loading={loading}
        chart={
          <CardSparkline
            data={SPARK.overdue}
            color="red"
            bloom="low"
            variant="hatched"
          />
        }
      />
      <StatCard
        label="Total Users"
        value={a?.users.total ?? 0}
        sub={`${a?.users.active ?? 0} active`}
        icon={IconUsers}
        loading={loading}
        chart={
          <CardSparkline data={SPARK.users} color="purple" bloom="high" />
        }
      />
      <StatCard
        label="Hours Logged"
        value={formatTaskTimeLogDuration(a?.totalTimeLogged ?? 0)}
        sub={`${a?.totalTimeLogged ?? 0} seconds total`}
        icon={IconClock}
        loading={loading}
        chart={
          <BarChart
            data={HOURS_BARS}
            config={{ hours: { label: "Hours", color: "pink" } }}
            bloom="aura"
            interactive={false}
            margins={{ top: 4, right: 2, bottom: 14, left: 2 }}
            className="h-full w-full"
          >
            <XAxis dataKey="day" />
            <Bar dataKey="hours" variant="gradient" />
          </BarChart>
        }
      />
      <div className="border p-5 flex flex-col gap-3 col-span-2">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          Projects by status
        </span>
        {loading ? (
          <Skeleton className="h-36 w-full" />
        ) : (
          <div className="h-36 w-full">
            <PieChart
              data={projectStatusData}
              config={projectStatusConfig}
              dataKey="value"
              nameKey="key"
              innerRadius={0.55}
              bloom="aura"
              margins={{ top: 8, right: 8, bottom: 8, left: 8 }}
              className="h-full w-full"
            >
              <Pie variant="gradient" />
            </PieChart>
          </div>
        )}
      </div>
    </div>
  );
}
