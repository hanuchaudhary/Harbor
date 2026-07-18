import { TaskStatus } from "@repo/db/enums";

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
  id: TaskStatus;
  label: string;
  color: WorkflowStatusColor;
  order: number;
  enabled: boolean;
  isDone: boolean;
};

export type OrgPreferences = {
  defaultTrackerView?: string;
  weekStartsOn?: string;
  workflowStatuses?: WorkflowStatusConfig[];
  [key: string]: unknown;
};

const VALID_COLORS = new Set<WorkflowStatusColor>([
  "neutral",
  "stone",
  "blue",
  "cyan",
  "indigo",
  "orange",
  "fuchsia",
  "yellow",
  "emerald",
]);

const VALID_STATUS_IDS = new Set<string>(Object.values(TaskStatus));

/** Default Harbor workflow — mirrors historical KANBAN_COLUMNS. */
export const DEFAULT_WORKFLOW_STATUSES: WorkflowStatusConfig[] = [
  {
    id: TaskStatus.DISCUSSION,
    label: "Discussion",
    color: "stone",
    order: 0,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.IN_PLANNING,
    label: "In Planning",
    color: "blue",
    order: 1,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.TODO,
    label: "To Do",
    color: "neutral",
    order: 2,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.DESIGN,
    label: "Design",
    color: "cyan",
    order: 3,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.DEVELOPMENT,
    label: "Development",
    color: "indigo",
    order: 4,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.REVIEW,
    label: "Review",
    color: "orange",
    order: 5,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.CLIENT_REVIEW,
    label: "Client Review",
    color: "fuchsia",
    order: 6,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.ON_HOLD,
    label: "On Hold",
    color: "yellow",
    order: 7,
    enabled: true,
    isDone: false,
  },
  {
    id: TaskStatus.COMPLETED,
    label: "Completed",
    color: "emerald",
    order: 8,
    enabled: true,
    isDone: true,
  },
];

export function parseOrgPreferences(
  metadata: string | null | undefined,
): OrgPreferences {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as OrgPreferences;
  } catch {
    return {};
  }
}

function isWorkflowStatusConfig(value: unknown): value is WorkflowStatusConfig {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    VALID_STATUS_IDS.has(row.id) &&
    typeof row.label === "string" &&
    typeof row.order === "number" &&
    typeof row.enabled === "boolean" &&
    (row.color === undefined ||
      (typeof row.color === "string" &&
        VALID_COLORS.has(row.color as WorkflowStatusColor))) &&
    (row.isDone === undefined || typeof row.isDone === "boolean")
  );
}

/**
 * Merge saved workflow with defaults so every system status is present.
 * Saved rows win for label/color/enabled/isDone/order when valid.
 */
export function resolveWorkflowStatuses(
  preferences: OrgPreferences | null | undefined,
): WorkflowStatusConfig[] {
  const saved = Array.isArray(preferences?.workflowStatuses)
    ? preferences.workflowStatuses.filter(isWorkflowStatusConfig)
    : [];

  const byId = new Map(saved.map((row) => [row.id, row]));

  const merged = DEFAULT_WORKFLOW_STATUSES.map((fallback) => {
    const override = byId.get(fallback.id);
    if (!override) return { ...fallback };
    return {
      id: fallback.id,
      label: override.label.trim() || fallback.label,
      color: VALID_COLORS.has(override.color) ? override.color : fallback.color,
      order:
        typeof override.order === "number" ? override.order : fallback.order,
      enabled: Boolean(override.enabled),
      isDone:
        typeof override.isDone === "boolean"
          ? override.isDone
          : fallback.isDone,
    };
  });

  return merged.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function getEnabledWorkflowStatuses(
  preferences: OrgPreferences | null | undefined,
): WorkflowStatusConfig[] {
  return resolveWorkflowStatuses(preferences).filter((s) => s.enabled);
}

export function getOpenStatusIds(
  preferences: OrgPreferences | null | undefined,
): TaskStatus[] {
  return resolveWorkflowStatuses(preferences)
    .filter((s) => s.enabled && !s.isDone)
    .map((s) => s.id);
}

export function isStatusEnabledForOrg(
  preferences: OrgPreferences | null | undefined,
  status: string,
): boolean {
  const row = resolveWorkflowStatuses(preferences).find((s) => s.id === status);
  return row?.enabled ?? false;
}

export type WorkflowValidationError = { message: string };

/**
 * Validate an incoming workflowStatuses array before persist.
 * Returns normalized configs or an error.
 */
export function validateWorkflowStatusesInput(
  input: unknown,
): { ok: true; value: WorkflowStatusConfig[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "workflowStatuses must be an array" };
  }

  if (input.length === 0) {
    return { ok: false, error: "workflowStatuses cannot be empty" };
  }

  const seen = new Set<string>();
  const normalized: WorkflowStatusConfig[] = [];

  for (const raw of input) {
    if (!isWorkflowStatusConfig(raw)) {
      return {
        ok: false,
        error:
          "Each workflow status needs a valid id, label, order, and enabled flag",
      };
    }
    if (seen.has(raw.id)) {
      return { ok: false, error: `Duplicate status id: ${raw.id}` };
    }
    seen.add(raw.id);

    const fallback =
      DEFAULT_WORKFLOW_STATUSES.find((d) => d.id === raw.id) ??
      DEFAULT_WORKFLOW_STATUSES[0]!;

    normalized.push({
      id: raw.id,
      label: raw.label.trim() || fallback.label,
      color: VALID_COLORS.has(raw.color) ? raw.color : fallback.color,
      order: raw.order,
      enabled: Boolean(raw.enabled),
      isDone:
        typeof raw.isDone === "boolean" ? raw.isDone : fallback.isDone,
    });
  }

  // Ensure every system status is represented (fill missing from defaults)
  for (const fallback of DEFAULT_WORKFLOW_STATUSES) {
    if (!seen.has(fallback.id)) {
      normalized.push({ ...fallback });
    }
  }

  const enabled = normalized.filter((s) => s.enabled);
  if (enabled.length === 0) {
    return { ok: false, error: "At least one status must be enabled" };
  }

  const hasDone = normalized.some((s) => s.enabled && s.isDone);
  if (!hasDone) {
    return {
      ok: false,
      error: "At least one enabled status must be marked as Done",
    };
  }

  return {
    ok: true,
    value: normalized.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
  };
}
