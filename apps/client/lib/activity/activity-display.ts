import type { ACTIVITY_ACTION } from "@/types/types";

export type ActivityCategory =
  | "PROJECT"
  | "TASK"
  | "SUBTASK"
  | "COMMENT"
  | "MENTION"
  | "TIMELOG"
  | "ATTACHMENT"
  | "ASSET"
  | "DOC"
  | "TAG"
  | "INVITE"
  | "USER";

export interface ActivityChange {
  field: string;
  label?: string;
  from?: string | number | boolean | null;
  to?: string | number | boolean | null;
}

export interface ActivityDisplay {
  description: string;
  actionLabel: string;
  category: ActivityCategory | "OTHER";
  categoryLabel: string;
  changes: ActivityChange[];
}

const ACTION_LABELS: Partial<Record<ACTIVITY_ACTION, string>> = {
  PROJECT_CREATED: "Project created",
  PROJECT_UPDATED: "Project updated",
  PROJECT_DELETED: "Project deleted",
  PROJECT_ARCHIVED: "Project archived",
  PROJECT_STATUS_CHANGED: "Project status changed",
  PROJECT_DATES_UPDATED: "Project dates changed",
  PROJECT_MEMBER_ADDED: "Member added",
  PROJECT_MEMBER_REMOVED: "Member removed",
  PROJECT_CLIENT_ADDED: "Client added",
  PROJECT_CLIENT_REMOVED: "Client removed",
  TASK_CREATED: "Task created",
  TASK_UPDATED: "Task updated",
  TASK_DELETED: "Task deleted",
  TASK_STATUS_CHANGED: "Task status changed",
  TASK_PRIORITY_CHANGED: "Task priority changed",
  TASK_ASSIGNED: "Task assigned",
  TASK_UNASSIGNED: "Task unassigned",
  TASK_COMPLETED: "Task completed",
  TASK_REOPENED: "Task reopened",
  TASK_MOVED: "Task moved",
  TASK_ORDER_CHANGED: "Tasks reordered",
  TASK_DEADLINE_CHANGED: "Task deadline changed",
  TASK_DESCRIPTION_UPDATED: "Task description changed",
  TASK_DEPENDENCY_ADDED: "Dependency added",
  TASK_DEPENDENCY_REMOVED: "Dependency removed",
  SUBTASK_CREATED: "Subtask created",
  SUBTASK_UPDATED: "Subtask updated",
  SUBTASK_DELETED: "Subtask deleted",
  SUBTASK_COMPLETED: "Subtask completed",
  SUBTASK_REOPENED: "Subtask reopened",
  COMMENT_ADDED: "Comment added",
  COMMENT_EDITED: "Comment edited",
  COMMENT_DELETED: "Comment deleted",
  MENTION_ADDED: "Mention added",
  TIMELOG_STARTED: "Timer started",
  TIMELOG_STOPPED: "Timer stopped",
  TIMELOG_ADDED: "Time logged",
  TIMELOG_UPDATED: "Time log updated",
  TIMELOG_DELETED: "Time log deleted",
  ATTACHMENT_ADDED: "Attachment added",
  ATTACHMENT_DELETED: "Attachment deleted",
  ASSET_UPLOADED: "Asset uploaded",
  ASSET_DELETED: "Asset deleted",
  ASSET_UPDATED: "Asset updated",
  DOC_CREATED: "Document created",
  DOC_UPDATED: "Document updated",
  DOC_DELETED: "Document deleted",
  TAG_CREATED: "Tag created",
  TAG_UPDATED: "Tag updated",
  TAG_ADDED_TO_TASK: "Tag added",
  TAG_REMOVED_FROM_TASK: "Tag removed",
  TAG_DELETED: "Tag deleted",
  INVITE_SENT: "Invitation sent",
  INVITE_ACCEPTED: "Invitation accepted",
  INVITE_EXPIRED: "Invitation expired",
  INVITE_REVOKED: "Invitation revoked",
  USER_CREATED: "User created",
  USER_UPDATED: "Profile updated",
  USER_DEACTIVATED: "User deactivated",
  USER_REACTIVATED: "User reactivated",
  USER_LOGIN: "User signed in",
  USER_LOGOUT: "User signed out",
};

export const ACTIVITY_CATEGORIES: {
  value: ActivityCategory;
  label: string;
}[] = [
  { value: "PROJECT", label: "Project" },
  { value: "TASK", label: "Task" },
  { value: "SUBTASK", label: "Subtask" },
  { value: "COMMENT", label: "Comment" },
  { value: "MENTION", label: "Mention" },
  { value: "TIMELOG", label: "Time log" },
  { value: "ATTACHMENT", label: "Attachment" },
  { value: "ASSET", label: "Asset" },
  { value: "DOC", label: "Document" },
  { value: "TAG", label: "Tag" },
  { value: "INVITE", label: "Invitation" },
  { value: "USER", label: "User" },
];

const CATEGORY_LABELS = Object.fromEntries(
  ACTIVITY_CATEGORIES.map(({ value, label }) => [value, label]),
) as Record<ActivityCategory, string>;

function humanize(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getActivityCategory(
  action: string,
): ActivityCategory | "OTHER" {
  const category = action.split("_")[0] as ActivityCategory;
  return category in CATEGORY_LABELS ? category : "OTHER";
}

export function getActivityActionLabel(action: string) {
  return ACTION_LABELS[action as ACTIVITY_ACTION] ?? humanize(action);
}

export function getActivityDescription(
  action: string,
  metadata: unknown,
): string {
  const record = asRecord(metadata);
  const description = record?.description;

  return typeof description === "string" && description.trim()
    ? description.trim()
    : getActivityActionLabel(action);
}

export function getActivityChanges(metadata: unknown): ActivityChange[] {
  const changes = asRecord(metadata)?.changes;
  if (!Array.isArray(changes)) return [];

  return changes.flatMap((change) => {
    const record = asRecord(change);
    if (!record || typeof record.field !== "string") return [];

    const isValue = (value: unknown) =>
      value === null ||
      ["string", "number", "boolean", "undefined"].includes(typeof value);

    if (!isValue(record.from) || !isValue(record.to)) return [];

    return [
      {
        field: record.field,
        ...(typeof record.label === "string" && { label: record.label }),
        ...(record.from !== undefined && {
          from: record.from as ActivityChange["from"],
        }),
        ...(record.to !== undefined && {
          to: record.to as ActivityChange["to"],
        }),
      },
    ];
  });
}

export function formatActivity(
  action: string,
  metadata: unknown,
): ActivityDisplay {
  const category = getActivityCategory(action);

  return {
    description: getActivityDescription(action, metadata),
    actionLabel: getActivityActionLabel(action),
    category,
    categoryLabel:
      category === "OTHER" ? "Activity" : CATEGORY_LABELS[category],
    changes: getActivityChanges(metadata),
  };
}
