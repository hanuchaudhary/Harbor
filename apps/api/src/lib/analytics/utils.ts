import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
} from "./types";

export function canViewPlatformAnalytics(role: string | undefined) {
  return role === "ADMIN" || role === "PROJECT_MANAGER";
}

export function parseAnalyticsRange(value: string | null): AnalyticsRange | null {
  const days = Number(value ?? 30);
  return ANALYTICS_RANGES.includes(days as AnalyticsRange)
    ? (days as AnalyticsRange)
    : null;
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function completionRate(completed: number, created: number) {
  return created === 0 ? 0 : Math.round((completed / created) * 100);
}
