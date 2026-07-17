"use client";

import { useQuery } from "@tanstack/react-query";
import { IconArrowUpRight } from "@tabler/icons-react";
import axios from "axios";
import Link from "next/link";

import type { PlatformAnalytics } from "@/lib/analytics/types";
import { ActivityTable } from "./activity-table";
import { DashboardCharts } from "./dashboard-charts";
import { StatCards } from "./stat-cards";

export function AdminDashboard() {
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError,
  } = useQuery<PlatformAnalytics>({
    queryKey: ["admin-analytics", 30],
    queryFn: () =>
      axios.get("/api/admin/analytics?range=30").then((response) => response.data),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-montreal-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Operations pulse
          </p>
          <h1 className="text-2xl font-montreal-medium">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live delivery signals across projects and teams.
          </p>
        </div>
        <Link
          href="/analytics"
          className="inline-flex w-fit items-center gap-2 border px-3 py-2 text-xs font-montreal-mono uppercase tracking-wider transition-colors hover:bg-muted"
        >
          Full analytics
          <IconArrowUpRight className="size-4 stroke-1.5" />
        </Link>
      </div>

      {isError && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Analytics could not be loaded. Try refreshing the page.
        </div>
      )}
      <StatCards data={analytics} loading={analyticsLoading} />
      <DashboardCharts data={analytics} loading={analyticsLoading} />

      <ActivityTable />
    </div>
  );
}
