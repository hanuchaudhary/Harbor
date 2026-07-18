import { TASK_STATUS } from "@/types/types";
import type { BadgeVariant } from "@/lib/constants";

export type WorkflowStatusColor =
  | "neutral"
  | "stone"
  | "blue"
  | "cyan"
  | "indigo"
  | "orange"
  | "fuchsia"
  | "yellow"
  | "emerald";

export type WorkflowStatusConfig = {
  id: TASK_STATUS;
  label: string;
  color: WorkflowStatusColor;
  order: number;
  enabled: boolean;
  isDone: boolean;
};

export type OrgWorkflowResponse = {
  statuses: WorkflowStatusConfig[];
  enabled: WorkflowStatusConfig[];
  preferences: {
    defaultTrackerView: string;
    weekStartsOn: string;
  };
};

export const DEFAULT_WORKFLOW_STATUSES: WorkflowStatusConfig[] = [
  {
    id: TASK_STATUS.DISCUSSION,
    label: "Discussion",
    color: "stone",
    order: 0,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.IN_PLANNING,
    label: "In Planning",
    color: "blue",
    order: 1,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.TODO,
    label: "To Do",
    color: "neutral",
    order: 2,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.DESIGN,
    label: "Design",
    color: "cyan",
    order: 3,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.DEVELOPMENT,
    label: "Development",
    color: "indigo",
    order: 4,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.REVIEW,
    label: "Review",
    color: "orange",
    order: 5,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.CLIENT_REVIEW,
    label: "Client Review",
    color: "fuchsia",
    order: 6,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.ON_HOLD,
    label: "On Hold",
    color: "yellow",
    order: 7,
    enabled: true,
    isDone: false,
  },
  {
    id: TASK_STATUS.COMPLETED,
    label: "Completed",
    color: "emerald",
    order: 8,
    enabled: true,
    isDone: true,
  },
];

export const WORKFLOW_COLOR_OPTIONS: {
  value: WorkflowStatusColor;
  label: string;
}[] = [
  { value: "neutral", label: "Neutral" },
  { value: "stone", label: "Stone" },
  { value: "blue", label: "Blue" },
  { value: "cyan", label: "Cyan" },
  { value: "indigo", label: "Indigo" },
  { value: "orange", label: "Orange" },
  { value: "fuchsia", label: "Fuchsia" },
  { value: "yellow", label: "Yellow" },
  { value: "emerald", label: "Emerald" },
];

export function workflowColorToBadge(
  color: WorkflowStatusColor | undefined,
): BadgeVariant {
  if (!color) return "neutral";
  if (color === "neutral") return "default";
  return color;
}

export function statusLabelFromWorkflow(
  status: string,
  statuses: WorkflowStatusConfig[],
): string {
  return (
    statuses.find((s) => s.id === status)?.label ??
    status.replace(/_/g, " ")
  );
}

export function statusColorFromWorkflow(
  status: string,
  statuses: WorkflowStatusConfig[],
): WorkflowStatusColor {
  return statuses.find((s) => s.id === status)?.color ?? "neutral";
}
