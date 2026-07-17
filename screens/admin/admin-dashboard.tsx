"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { type Analytics, StatCards } from "./stat-cards";
import { ActivityTable } from "./activity-table";

export function AdminDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["admin-analytics"],
    queryFn: () => axios.get("/api/admin/analytics").then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-montreal-medium">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform overview across all projects and users.
        </p>
      </div>

      <StatCards data={analytics} loading={analyticsLoading} />

      <ActivityTable />
    </div>
  );
}
