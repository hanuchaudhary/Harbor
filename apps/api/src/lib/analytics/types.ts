export const ANALYTICS_RANGES = [7, 30, 90] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export interface AnalyticsSeriesPoint {
  date: string;
  tasksCreated: number;
  tasksCompleted: number;
  secondsLogged: number;
  projectsCreated: number;
}

export interface AnalyticsWorkload {
  userId: string;
  name: string;
  image: string | null;
  openTasks: number;
  completedTasks: number;
  secondsLogged: number;
}

export interface PlatformAnalytics {
  range: {
    days: AnalyticsRange;
    from: string;
    to: string;
  };
  projects: {
    total: number;
    active: number;
    onHold: number;
    completed: number;
    archived: number;
    createdInPeriod: number;
    createdInPreviousPeriod: number;
  };
  tasks: {
    total: number;
    open: number;
    completed: number;
    overdue: number;
    createdInPeriod: number;
    createdInPreviousPeriod: number;
    completedInPeriod: number;
    completedInPreviousPeriod: number;
    completionRate: number;
    previousCompletionRate: number;
    completionRateChange: number | null;
    byStatus: Record<string, number>;
  };
  time: {
    totalSeconds: number;
    secondsInPeriod: number;
    secondsInPreviousPeriod: number;
    change: number | null;
  };
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  series: AnalyticsSeriesPoint[];
  workload: AnalyticsWorkload[];
}
