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

import { formatDuration } from "date-fns";

import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTaskTimeLogDuration } from "@/lib/utils";

function formatHoursToTime(hours: number): string {
  if (hours === 0) return "0 hours";
  const totalHours = Math.floor(hours);

  const years = Math.floor(totalHours / (24 * 365));
  const remainingAfterYears = totalHours % (24 * 365);
  const months = Math.floor(remainingAfterYears / (24 * 30));
  const remainingAfterMonths = remainingAfterYears % (24 * 30);
  const days = Math.floor(remainingAfterMonths / 24);
  const remainingHours = remainingAfterMonths % 24;

  return formatDuration(
    {
      years,
      months,
      days,
      hours: remainingHours,
    },
    {
      delimiter: ", ",
      zero: false,
    },
  );
}

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

function StatCard({
  label,
  value,
  sub,
  change,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  sub?: string;
  change?: number | null;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          {label}
        </span>
        <Icon className="size-4 stroke-1.5 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <span className="text-3xl font-montreal-medium">{value}</span>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
    </div>
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Active Projects"
        value={a?.projects.active ?? 0}
        sub={`${a?.projects.total ?? 0} total`}
        icon={IconBuildingBridge2}
        loading={loading}
      />
      <StatCard
        label="Open Tasks"
        value={a?.tasks.open ?? 0}
        sub={`${a?.tasks.total ?? 0} total`}
        icon={IconActivity}
        loading={loading}
      />
      <StatCard
        label="Completed This Month"
        value={a?.tasks.completedThisMonth ?? 0}
        change={a?.tasks.completionChange ?? null}
        icon={IconCheck}
        loading={loading}
      />
      <StatCard
        label="Overdue Tasks"
        value={a?.tasks.overdue ?? 0}
        sub="past deadline"
        icon={IconAlertTriangle}
        loading={loading}
      />
      <StatCard
        label="Total Users"
        value={a?.users.total ?? 0}
        sub={`${a?.users.active ?? 0} active`}
        icon={IconUsers}
        loading={loading}
      />
      <StatCard
        label="Hours Logged"
        value={formatTaskTimeLogDuration(a?.totalTimeLogged ?? 0)}
        sub={`${a?.totalTimeLogged ?? 0} seconds total`}
        icon={IconClock}
        loading={loading}
      />
      <div className="border p-5 flex flex-col gap-3">
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          Projects by status
        </span>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : (
          <div className="space-y-2 mt-1">
            {(
              [
                {
                  label: "Active",
                  value: a?.projects.active ?? 0,
                  color: "bg-emerald-500",
                },
                {
                  label: "On Hold",
                  value: a?.projects.onHold ?? 0,
                  color: "bg-yellow-500",
                },
                {
                  label: "Completed",
                  value: a?.projects.completed ?? 0,
                  color: "bg-blue-500",
                },
                {
                  label: "Archived",
                  value: a?.projects.archived ?? 0,
                  color: "bg-muted-foreground/50",
                },
              ] as const
            ).map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn("size-2 rounded-full shrink-0", item.color)}
                  />
                  <span className="text-muted-foreground text-xs">
                    {item.label}
                  </span>
                </div>
                <span className="font-medium text-xs tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
