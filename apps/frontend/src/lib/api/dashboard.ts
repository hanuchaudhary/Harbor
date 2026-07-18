import { http } from "./http";

export type DashboardStats = {
  range: { days: number };
  stats: {
    openTasks: number;
    overdueTasks: number;
    completedInPeriod: number;
    totalAssigned: number;
    activeProjects: number;
    totalProjects: number;
    secondsInPeriod: number;
    totalSeconds: number;
    unreadNotifications: number;
  };
  tasksByStatus: Record<string, number>;
  activeTimer: {
    id: string;
    startedAt: string;
    task: {
      id: string;
      title: string;
      project: { name: string; slug: string };
    };
  } | null;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    endDate: string | null;
    project: { id: string; name: string; slug: string };
  }>;
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata: unknown;
    project: { id: string; name: string; slug: string } | null;
    task: { id: string; title: string } | null;
  }>;
};

export class DashboardApi {
  async get(): Promise<DashboardStats> {
    const { data } = await http.get("/api/dashboard");
    return data;
  }
}

export const dashboardApi = new DashboardApi();
