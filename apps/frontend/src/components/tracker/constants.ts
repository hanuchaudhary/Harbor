import { PRIORITY, TASK_STATUS } from "@/types/types";

export const KANBAN_COLUMNS: { id: TASK_STATUS; label: string }[] = [
  { id: TASK_STATUS.DISCUSSION, label: "Discussion" },
  { id: TASK_STATUS.IN_PLANNING, label: "In Planning" },
  { id: TASK_STATUS.TODO, label: "To Do" },
  { id: TASK_STATUS.DESIGN, label: "Design" },
  { id: TASK_STATUS.DEVELOPMENT, label: "Development" },
  { id: TASK_STATUS.REVIEW, label: "Review" },
  { id: TASK_STATUS.CLIENT_REVIEW, label: "Client Review" },
  { id: TASK_STATUS.ON_HOLD, label: "On Hold" },
  { id: TASK_STATUS.COMPLETED, label: "Completed" },
];

export const priorityVariant: Record<
  PRIORITY,
  "emerald" | "blue" | "yellow" | "red"
> = {
  LOW: "blue",
  MEDIUM: "emerald",
  HIGH: "yellow",
  CRITICAL: "red",
};

export const priorityLabel: Record<PRIORITY, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const priorityOrder: PRIORITY[] = [
  PRIORITY.LOW,
  PRIORITY.MEDIUM,
  PRIORITY.HIGH,
  PRIORITY.CRITICAL,
];

export const statusLabel: Record<TASK_STATUS, string> = {
  DISCUSSION: "Discussion",
  IN_PLANNING: "In Planning",
  TODO: "To Do",
  DESIGN: "Design",
  DEVELOPMENT: "Development",
  REVIEW: "Review",
  CLIENT_REVIEW: "Client Review",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

export const statusVariant: Record<
  TASK_STATUS,
  | "neutral"
  | "stone"
  | "blue"
  | "cyan"
  | "indigo"
  | "orange"
  | "fuchsia"
  | "yellow"
  | "emerald"
> = {
  TODO: "neutral",
  DISCUSSION: "stone",
  IN_PLANNING: "blue",
  DESIGN: "cyan",
  DEVELOPMENT: "indigo",
  REVIEW: "orange",
  CLIENT_REVIEW: "fuchsia",
  ON_HOLD: "yellow",
  COMPLETED: "emerald",
};

const timelinePriorityDotColor: Record<PRIORITY, string> = {
  LOW: "bg-blue-600",
  MEDIUM: "bg-emerald-600",
  HIGH: "bg-yellow-500",
  CRITICAL: "bg-rose-600",
};

const timelineStatusStripColor: Record<TASK_STATUS, string> = {
  TODO: "bg-neutral-600",
  DISCUSSION: "bg-stone-600",
  IN_PLANNING: "bg-blue-400",
  DESIGN: "bg-cyan-600",
  DEVELOPMENT: "bg-indigo-500",
  REVIEW: "bg-orange-400",
  CLIENT_REVIEW: "bg-fuchsia-400",
  ON_HOLD: "bg-yellow-400",
  COMPLETED: "bg-emerald-500",
};

export function getTimelinePriorityDotColor(priority: PRIORITY): string {
  return timelinePriorityDotColor[priority];
}

export function getTimelineStatusStripColor(status: TASK_STATUS): string {
  return timelineStatusStripColor[status];
}
