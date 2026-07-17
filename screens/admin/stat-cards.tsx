"use client";

import {
  IconActivity,
  IconArrowDown,
  IconArrowUp,
  IconBuildingBridge2,
  IconCheck,
  IconClock,
  IconMinus,
} from "@tabler/icons-react";

import type { DitherColor } from "@/components/dither-kit/palette";
import { Sparkline } from "@/components/dither-kit/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlatformAnalytics } from "@/lib/analytics/types";
import { cn, formatTaskTimeLogDuration } from "@/lib/utils";

export type Analytics = PlatformAnalytics;

function StatCard({
  label,
  value,
  sub,
  change,
  changeLabel = "vs previous period",
  icon: Icon,
  loading,
  chart,
}: {
  label: string;
  value: number | string;
  sub?: string;
  change?: number | null;
  changeLabel?: string;
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
            {Math.abs(change)}% {changeLabel}
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
  const change = (current: number, previous: number) =>
    previous === 0
      ? null
      : Math.round(((current - previous) / previous) * 100);
  const series = a?.series ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Active Projects"
        value={a?.projects.active ?? 0}
        sub={`${a?.projects.createdInPeriod ?? 0} created in ${a?.range.days ?? 30}d`}
        change={
          a
            ? change(
                a.projects.createdInPeriod,
                a.projects.createdInPreviousPeriod,
              )
            : null
        }
        changeLabel="project intake"
        icon={IconBuildingBridge2}
        loading={loading}
        chart={
          <CardSparkline
            data={series.map((point) => point.projectsCreated)}
            color="blue"
            bloom="aura"
          />
        }
      />
      <StatCard
        label="Open Tasks"
        value={a?.tasks.open ?? 0}
        sub={`${a?.tasks.overdue ?? 0} overdue`}
        change={
          a
            ? change(
                a.tasks.createdInPeriod,
                a.tasks.createdInPreviousPeriod,
              )
            : null
        }
        changeLabel="task intake"
        icon={IconActivity}
        loading={loading}
        chart={
          <CardSparkline
            data={series.map((point) => point.tasksCreated)}
            color="orange"
            bloom="high"
            variant="dotted"
          />
        }
      />
      <StatCard
        label="Completion Rate"
        value={`${a?.tasks.completionRate ?? 0}%`}
        sub={`${a?.tasks.completedInPeriod ?? 0} completed`}
        change={a?.tasks.completionRateChange ?? null}
        icon={IconCheck}
        loading={loading}
        chart={
          <CardSparkline
            data={series.map((point) => point.tasksCompleted)}
            color="green"
            bloom="aura"
          />
        }
      />
      <StatCard
        label="Hours Logged"
        value={formatTaskTimeLogDuration(a?.time.secondsInPeriod ?? 0)}
        sub={`last ${a?.range.days ?? 30} days`}
        change={a?.time.change ?? null}
        icon={IconClock}
        loading={loading}
        chart={
          <CardSparkline
            data={series.map((point) => point.secondsLogged)}
            color="pink"
            bloom="aura"
            variant="gradient"
          />
        }
      />
    </div>
  );
}
