"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import UserAvatar from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { formatActivity } from "@/lib/activity/activity-display";
import { formatDate } from "@/lib/utils";
import type { ActivityLog } from "@/types/types";

interface ActivityTimelineItemProps {
  activity: ActivityLog;
  showCategory?: boolean;
  showChanges?: boolean;
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function ActivityTimelineItem({
  activity,
  showCategory = true,
  showChanges = true,
}: ActivityTimelineItemProps) {
  const display = formatActivity(activity.action, activity.metadata);
  const createdAt = new Date(activity.createdAt);
  const taskHref =
    activity.task && activity.project
      ? `/projects/${activity.project.slug}/tracker/${activity.task.id}`
      : null;

  return (
    <li className="relative flex gap-3 rounded-md px-1 py-2">
      <div className="relative z-10 shrink-0 rounded-full bg-background ring-4 ring-background">
        <UserAvatar
          src={activity.user.image ?? ""}
          alt={activity.user.name}
          size="sm"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-sm leading-5">
            <span className="font-medium text-foreground">
              {activity.user.name}
            </span>{" "}
            <span className="text-muted-foreground">
              {display.description}
            </span>
          </p>
          {showCategory && (
            <Badge
              variant="secondary"
              className="h-5 shrink-0 px-1.5 text-[10px] font-normal"
            >
              {display.categoryLabel}
            </Badge>
          )}
        </div>

        {(activity.project || activity.task) && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {activity.project && (
              <Link
                href={`/projects/${activity.project.slug}`}
                className="truncate hover:text-foreground hover:underline"
              >
                {activity.project.name}
              </Link>
            )}
            {activity.project && activity.task && <span aria-hidden>·</span>}
            {activity.task &&
              (taskHref ? (
                <Link
                  href={taskHref}
                  className="truncate hover:text-foreground hover:underline"
                >
                  {activity.task.title}
                </Link>
              ) : (
                <span className="truncate">{activity.task.title}</span>
              ))}
          </div>
        )}

        {showChanges && display.changes.length > 0 && (
          <dl className="mt-2 flex flex-wrap gap-1.5">
            {display.changes.slice(0, 3).map((change) => (
              <div
                key={change.field}
                className="flex max-w-full items-center gap-1 rounded-sm border bg-muted/30 px-2 py-1 text-[11px]"
              >
                <dt className="font-medium text-foreground">
                  {change.label ?? change.field.replace(/([A-Z])/g, " $1")}:
                </dt>
                <dd className="truncate text-muted-foreground">
                  {formatValue(change.from)} → {formatValue(change.to)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <time
          dateTime={activity.createdAt}
          title={formatDate(createdAt, "dateTime")}
          className="mt-1.5 block text-xs text-muted-foreground/70"
        >
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </time>
      </div>
    </li>
  );
}
