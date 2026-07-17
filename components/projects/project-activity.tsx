"use client";

import { useQuery } from "@tanstack/react-query";
import { ActivityLogQueries } from "@/lib/query/query.func";
import { formatDate } from "@/lib/utils";
import UserAvatar from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityLog } from "@/types/types";

interface ProjectActivityProps {
  projectSlug: string;
}

const ACTION_LABELS: Record<string, string> = {
  PROJECT_CREATED: "created the project",
  PROJECT_UPDATED: "updated the project",
  PROJECT_DELETED: "deleted the project",
  PROJECT_ARCHIVED: "archived the project",
  PROJECT_STATUS_CHANGED: "changed project status",
  PROJECT_BUDGET_UPDATED: "updated project budget",
  PROJECT_DATES_UPDATED: "updated project dates",
  PROJECT_MEMBER_ADDED: "added a team member",
  PROJECT_MEMBER_REMOVED: "removed a team member",
  PROJECT_CLIENT_ADDED: "added a client",
  PROJECT_CLIENT_REMOVED: "removed a client",
  TASK_CREATED: "created a task",
  TASK_UPDATED: "updated a task",
  TASK_DELETED: "deleted a task",
  TASK_STATUS_CHANGED: "changed task status",
  TASK_PRIORITY_CHANGED: "changed task priority",
  TASK_ASSIGNED: "assigned a task",
  TASK_UNASSIGNED: "unassigned a task",
  TASK_COMPLETED: "completed a task",
  TASK_REOPENED: "reopened a task",
  TASK_MOVED: "moved a task",
  TASK_ORDER_CHANGED: "reordered tasks",
  TASK_DEADLINE_CHANGED: "changed task deadline",
  TASK_MILESTONE_CHANGED: "changed task milestone",
  TASK_DESCRIPTION_UPDATED: "updated task description",
  SUBTASK_CREATED: "created a subtask",
  SUBTASK_UPDATED: "updated a subtask",
  SUBTASK_DELETED: "deleted a subtask",
  SUBTASK_COMPLETED: "completed a subtask",
  SUBTASK_REOPENED: "reopened a subtask",
  MILESTONE_CREATED: "created a milestone",
  MILESTONE_UPDATED: "updated a milestone",
  MILESTONE_DELETED: "deleted a milestone",
  MILESTONE_STATUS_CHANGED: "changed milestone status",
  MILESTONE_COMPLETED: "completed a milestone",
  MILESTONE_DELAYED: "marked milestone as delayed",
  MILESTONE_BUDGET_UPDATED: "updated milestone budget",
  COMMENT_ADDED: "added a comment",
  COMMENT_EDITED: "edited a comment",
  COMMENT_DELETED: "deleted a comment",
  MENTION_ADDED: "mentioned someone",
  TIMELOG_STARTED: "started time tracking",
  TIMELOG_STOPPED: "stopped time tracking",
  TIMELOG_ADDED: "logged time",
  TIMELOG_UPDATED: "updated time log",
  TIMELOG_DELETED: "deleted time log",
  ATTACHMENT_ADDED: "added an attachment",
  ATTACHMENT_DELETED: "deleted an attachment",
  ASSET_UPLOADED: "uploaded an asset",
  ASSET_DELETED: "deleted an asset",
  ASSET_UPDATED: "updated an asset",
  DOC_CREATED: "created a document",
  DOC_UPDATED: "updated a document",
  DOC_DELETED: "deleted a document",
  TAG_CREATED: "created a tag",
  TAG_ADDED_TO_TASK: "added a tag to task",
  TAG_REMOVED_FROM_TASK: "removed a tag from task",
  TAG_DELETED: "deleted a tag",
  INVITE_SENT: "sent an invitation",
  INVITE_ACCEPTED: "accepted an invitation",
  INVITE_EXPIRED: "invitation expired",
  INVITE_REVOKED: "revoked an invitation",
  USER_CREATED: "joined the platform",
  USER_UPDATED: "updated their profile",
  USER_DEACTIVATED: "was deactivated",
  USER_REACTIVATED: "was reactivated",
  USER_LOGIN: "logged in",
  USER_LOGOUT: "logged out",
};

export function ProjectActivity({ projectSlug }: ProjectActivityProps) {
  const { data, isLoading } = useQuery({
    queryKey: ActivityLogQueries.keys.byProject(projectSlug),
    queryFn: () => ActivityLogQueries.fetchByProject(projectSlug),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activityLogs = (data?.activityLogs || []) as ActivityLog[];

  if (activityLogs.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-3 bottom-3 w-px bg-border" />
        <div className="space-y-4">
          {activityLogs.map((log) => (
            <div key={log.id} className="relative flex items-start gap-3">
              <div className="relative z-10 ring-2 ring-background rounded-full">
                <UserAvatar
                  src={log.user.image || ""}
                  alt={log.user.name}
                  size="sm"
                />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">{log.user.name}</span>{" "}
                  <span className="text-muted-foreground">
                    {log.metadata &&
                    typeof log.metadata === "object" &&
                    (log.metadata as Record<string, unknown>).description
                      ? String(
                          (log.metadata as Record<string, unknown>).description,
                        )
                      : ACTION_LABELS[log.action] ||
                        log.action.toLowerCase().replace(/_/g, " ")}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDate(log.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
