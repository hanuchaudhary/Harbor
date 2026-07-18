export enum ROLE {
  ADMIN = "ADMIN",
  PARTNER = "PARTNER",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  DEVELOPER = "DEVELOPER",
  CLIENT = "CLIENT",
  ACCOUNTANT = "ACCOUNTANT",
}

export enum PROJECT_STATUS {
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: PROJECT_STATUS;
  startDate: string | null;
  estimatedEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  repos?: Array<{ id: string; name: string; url: string }>;
  _count: {
    members: number;
    tasks: number;
  };
}

export enum TASK_STATUS {
  DISCUSSION = "DISCUSSION",
  IN_PLANNING = "IN_PLANNING",
  TODO = "TODO",
  DESIGN = "DESIGN",
  DEVELOPMENT = "DEVELOPMENT",
  REVIEW = "REVIEW",
  CLIENT_REVIEW = "CLIENT_REVIEW",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
}

export enum PRIORITY {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  deadline: string | null;
  order: number;
}

export interface TaskComment {
  id: string;
  body: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; image: string | null };
}

export interface TaskAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  dependsOnTaskId: string;
  createdAt: string;
  dependsOnTask: {
    id: string;
    title: string;
    status: TASK_STATUS;
    priority: PRIORITY;
    completedAt: string | null;
  };
}

export interface TaskHistoryEntry {
  id: string;
  from: TASK_STATUS;
  to: TASK_STATUS;
  changedBy: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  lastSeenAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  createdById?: string | null;
  status: TASK_STATUS;
  priority: PRIORITY;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  progressPct: number;
  totalTime?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  repoId?: string | null;
  project: { id: string; name: string; slug: string };
  repo?: { id: string; name: string; url: string } | null;
  assignees: Array<{
    id: string;
    user: { id: string; name: string; email: string; image: string | null };
  }>;
  tags: Array<{ tag: Tag }>;
  subtasks: Subtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  history: TaskHistoryEntry[];
  timeLogs: TimeLog[];
  dependencies?: TaskDependency[];
  dependents?: Array<{
    id: string;
    taskId: string;
    createdAt: string;
    task: {
      id: string;
      title: string;
      status: TASK_STATUS;
      priority: PRIORITY;
      completedAt: string | null;
    };
  }>;
}

export enum TIME_LOG_TYPE {
  MANUAL = "MANUAL",
  AUTO = "AUTO",
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  type: TIME_LOG_TYPE;
  duration: number;
  startedAt: string | null;
  endedAt: string | null;
  lastHeartbeatAt: string | null;
  note: string | null;
  isRunning: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; image: string | null };
}

export interface ActivityLog {
  id: string;
  userId: string;
  projectId: string | null;
  taskId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string; image: string | null };
  project?: { id: string; name: string; slug: string } | null;
  task?: { id: string; title: string } | null;
}

export type ACTIVITY_ACTION =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "PROJECT_ARCHIVED"
  | "PROJECT_STATUS_CHANGED"
  | "PROJECT_DATES_UPDATED"
  | "PROJECT_MEMBER_ADDED"
  | "PROJECT_MEMBER_REMOVED"
  | "PROJECT_CLIENT_ADDED"
  | "PROJECT_CLIENT_REMOVED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "TASK_STATUS_CHANGED"
  | "TASK_PRIORITY_CHANGED"
  | "TASK_ASSIGNED"
  | "TASK_UNASSIGNED"
  | "TASK_COMPLETED"
  | "TASK_REOPENED"
  | "TASK_MOVED"
  | "TASK_ORDER_CHANGED"
  | "TASK_DEADLINE_CHANGED"
  | "TASK_DESCRIPTION_UPDATED"
  | "TASK_DEPENDENCY_ADDED"
  | "TASK_DEPENDENCY_REMOVED"
  | "SUBTASK_CREATED"
  | "SUBTASK_UPDATED"
  | "SUBTASK_DELETED"
  | "SUBTASK_COMPLETED"
  | "SUBTASK_REOPENED"
  | "COMMENT_ADDED"
  | "COMMENT_EDITED"
  | "COMMENT_DELETED"
  | "MENTION_ADDED"
  | "TIMELOG_STARTED"
  | "TIMELOG_STOPPED"
  | "TIMELOG_ADDED"
  | "TIMELOG_UPDATED"
  | "TIMELOG_DELETED"
  | "ATTACHMENT_ADDED"
  | "ATTACHMENT_DELETED"
  | "ASSET_UPLOADED"
  | "ASSET_DELETED"
  | "ASSET_UPDATED"
  | "DOC_CREATED"
  | "DOC_UPDATED"
  | "DOC_DELETED"
  | "TAG_CREATED"
  | "TAG_UPDATED"
  | "TAG_ADDED_TO_TASK"
  | "TAG_REMOVED_FROM_TASK"
  | "TAG_DELETED"
  | "INVITE_SENT"
  | "INVITE_ACCEPTED"
  | "INVITE_EXPIRED"
  | "INVITE_REVOKED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "USER_LOGIN"
  | "USER_LOGOUT";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
