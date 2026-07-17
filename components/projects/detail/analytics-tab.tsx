"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "@/components/user-avatar";
import { formatTaskTimeLogDuration } from "@/lib/utils";

interface AnalyticsData {
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  milestonesByStatus: { status: string; count: number }[];
  memberWorkload: {
    userId: string;
    name: string;
    image: string | null;
    taskCount: number;
    totalTimeMinutes: number;
  }[];
  summary: {
    totalTasks: number;
    completedTasks: number;
    totalTimeMinutes: number;
    openTasks: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  DISCUSSION: "#6b7280",
  IN_PLANNING: "#8b5cf6",
  TODO: "#3b82f6",
  DESIGN: "#6366f1",
  DEVELOPMENT: "#f97316",
  REVIEW: "#eab308",
  CLIENT_REVIEW: "#f59e0b",
  ON_HOLD: "#ef4444",
  COMPLETED: "#22c55e",
};

const STATUS_LABELS: Record<string, string> = {
  DISCUSSION: "Discussion",
  IN_PLANNING: "In Planning",
  TODO: "Todo",
  DESIGN: "Design",
  DEVELOPMENT: "Development",
  REVIEW: "Review",
  CLIENT_REVIEW: "Client Review",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#3b82f6",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const MILESTONE_COLORS: Record<string, string> = {
  NOT_STARTED: "#6b7280",
  IN_PROGRESS: "#3b82f6",
  COMPLETED: "#22c55e",
  DELAYED: "#ef4444",
};

const MILESTONE_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
};

const baseConfig: ChartConfig = { value: { label: "Count" } };
const memberConfig: ChartConfig = {
  tasks: { label: "Tasks", color: "#3b82f6" },
  hours: { label: "Hours", color: "#22c55e" },
};

export function AnalyticsTab({ projectSlug }: { projectSlug: string }) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["project-analytics", projectSlug],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/projects/${projectSlug}/analytics`,
      );
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusChartData = data.tasksByStatus.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    value: d.count,
    fill: STATUS_COLORS[d.status] ?? "#6b7280",
  }));

  const priorityChartData = data.tasksByPriority.map((d) => ({
    name: PRIORITY_LABELS[d.priority] ?? d.priority,
    value: d.count,
    fill: PRIORITY_COLORS[d.priority] ?? "#6b7280",
  }));

  const milestoneChartData = data.milestonesByStatus.map((d) => ({
    name: MILESTONE_LABELS[d.status] ?? d.status,
    value: d.count,
    fill: MILESTONE_COLORS[d.status] ?? "#6b7280",
  }));

  const memberChartData = [...data.memberWorkload]
    .sort((a, b) => b.taskCount - a.taskCount)
    .map((m) => ({
      name: m.name.split(" ")[0],
      tasks: m.taskCount,
      hours: +(m.totalTimeMinutes / 3600).toFixed(1),
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks", value: data.summary.totalTasks },
          { label: "Completed", value: data.summary.completedTasks },
          { label: "Open Tasks", value: data.summary.openTasks },
          {
            label: "Time Logged",
            value: formatTaskTimeLogDuration(data.summary.totalTimeMinutes),
          },
        ].map(({ label, value }) => (
          <div key={label} className="border p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statusChartData.length > 0 && (
          <div className="border p-4 space-y-3">
            <p className="text-sm font-medium">Tasks by Status</p>
            <ChartContainer config={baseConfig} className="h-56">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {statusChartData.map((s) => (
                <span
                  key={s.name}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.fill }}
                  />
                  {s.name} ({s.value})
                </span>
              ))}
            </div>
          </div>
        )}

        {priorityChartData.length > 0 && (
          <div className="border p-4 space-y-3">
            <p className="text-sm font-medium">Tasks by Priority</p>
            <ChartContainer config={baseConfig} className="h-56">
              <BarChart
                data={priorityChartData}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={4}>
                  {priorityChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {milestoneChartData.length > 0 && (
          <div className="border p-4 space-y-3">
            <p className="text-sm font-medium">Milestones by Status</p>
            <ChartContainer config={baseConfig} className="h-56">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={milestoneChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {milestoneChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {milestoneChartData.map((m) => (
                <span
                  key={m.name}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: m.fill }}
                  />
                  {m.name} ({m.value})
                </span>
              ))}
            </div>
          </div>
        )}

        {memberChartData.length > 0 && (
          <div className="border p-4 space-y-3">
            <p className="text-sm font-medium">Member Workload</p>
            <ChartContainer config={memberConfig} className="h-56">
              <BarChart
                data={memberChartData}
                margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="tasks"
                  fill="var(--color-tasks)"
                  radius={[4, 4, 0, 0]}
                  name="Tasks"
                />
                <Bar
                  dataKey="hours"
                  fill="var(--color-hours)"
                  radius={[4, 4, 0, 0]}
                  name="Hours"
                />
              </BarChart>
            </ChartContainer>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-blue-500" />
                Tasks assigned
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
                Hours logged
              </span>
            </div>
          </div>
        )}
      </div>

      {data.memberWorkload.length > 0 && (
        <div className="border divide-y">
          <div className="px-4 py-2 bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Member Breakdown
            </p>
          </div>
          {[...data.memberWorkload]
            .sort((a, b) => b.taskCount - a.taskCount)
            .map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar src={m.image ?? ""} alt={m.name} />
                  <p className="text-sm font-medium">{m.name}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>
                    {m.taskCount} task{m.taskCount !== 1 ? "s" : ""}
                  </span>
                  <span>{formatTaskTimeLogDuration(m.totalTimeMinutes)} logged</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
