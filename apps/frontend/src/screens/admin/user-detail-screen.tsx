"use client";

import { useQuery } from "@tanstack/react-query";
import { UserQueries } from "@/lib/query/query.func";
import { Link, useNavigate } from "react-router";
import { formatDate, formatTaskTimeLogDuration } from "@/lib/utils";
import {
  IconArrowLeft,
  IconClock,
  IconCheck,
  IconAlertCircle,
  IconActivity,
  IconFolder,
  IconMessage,
  IconBell,
  IconBrandGithub,
  IconMail,
  IconCalendar,
  IconChartBar,
  IconChecklist,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "@/components/user-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BackButton from "@/components/back";
import { ActivityTimelineItem } from "@/components/activity/activity-timeline-item";

export function UserDetailScreen({ userId }: { userId: string }) {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: UserQueries.keys.detail(userId),
    queryFn: () => UserQueries.fetchById(userId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-4">
        <IconAlertCircle className="h-12 w-12 text-muted-foreground stroke-1" />
        <div className="text-center">
          <h2 className="text-2xl font-montreal-medium">User not found</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            The user you're looking for doesn't exist or has been deleted.
          </p>
        </div>
        <BackButton href="/admin/users" />
      </div>
    );
  }

  const { user, analytics } = data;

  const statsCards = [
    {
      label: "Total Projects",
      value: analytics.totalProjects,
      icon: IconFolder,
      sub: `${analytics.activeProjects} active`,
    },
    {
      label: "Total Tasks",
      value: analytics.totalTasks,
      icon: IconChecklist,
      sub: `${analytics.completedTasks} completed`,
    },
    {
      label: "Time Logged",
      value: formatTaskTimeLogDuration(analytics.totalTimeLogged),
      icon: IconClock,
      sub: "Total tracked",
    },
    {
      label: "Comments",
      value: analytics.totalComments,
      icon: IconMessage,
      sub: "Total comments",
    },
    {
      label: "Activities",
      value: analytics.totalActivities,
      icon: IconActivity,
      sub: "Total logs",
    },
    {
      label: "Notifications",
      value: user._count.notifications,
      icon: IconBell,
      sub: `${analytics.unreadNotifications} unread`,
    },
  ];

  return (
    <div className="space-y-8">
      <BackButton href="/admin/users" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <UserAvatar src={user.image || ""} alt={user.name} size="lg" />
          <div>
            <h1 className="text-xl font-montreal-medium">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">{user.role}</Badge>
            <Badge variant={user.isActive ? "default" : "secondary"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
            {user.emailVerified && (
              <Badge variant="outline">
                <IconCheck className="h-3 w-3 mr-1 stroke-1.5" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="border p-6">
        <h2 className="text-sm font-montreal-medium mb-4">User Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <IconMail className="h-4 w-4 stroke-1.5 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span>{user.email}</span>
          </div>
          {user.githubUsername && (
            <div className="flex items-center gap-2 text-sm">
              <IconBrandGithub className="h-4 w-4 stroke-1.5 text-muted-foreground" />
              <span className="text-muted-foreground">GitHub:</span>
              <a
                href={`https://github.com/${user.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                @{user.githubUsername}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <IconCalendar className="h-4 w-4 stroke-1.5 text-muted-foreground" />
            <span className="text-muted-foreground">Joined:</span>
            <span>{formatDate(new Date(user.createdAt), "long")}</span>
          </div>
          {user.lastSeenAt && (
            <div className="flex items-center gap-2 text-sm">
              <IconActivity className="h-4 w-4 stroke-1.5 text-muted-foreground" />
              <span className="text-muted-foreground">Last seen:</span>
              <span>
                {formatDate(new Date(user.lastSeenAt), "dateTimeLong")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <IconChartBar className="h-5 w-5 stroke-1.5" />
          <h2 className="text-sm font-montreal-medium">Analytics Overview</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statsCards.map((stat) => (
            <div key={stat.label} className="border p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">
                  {stat.label}
                </span>
                <stat.icon className="size-4 stroke-1.5 text-muted-foreground" />
              </div>
              <span className="text-3xl font-montreal-medium">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-6">
          <h3 className="text-sm font-montreal-medium mb-4">Tasks by Status</h3>
          {Object.keys(analytics.tasksByStatus).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(analytics.tasksByStatus).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between text-sm"
                  >
                    <Badge variant="outline">{status}</Badge>
                    <span className="font-montreal-medium">
                      {count as number}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks assigned</p>
          )}
        </div>

        <div className="border p-6">
          <h3 className="text-sm font-montreal-medium mb-4">
            Tasks by Priority
          </h3>
          {Object.keys(analytics.tasksByPriority).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(analytics.tasksByPriority).map(
                ([priority, count]) => (
                  <div
                    key={priority}
                    className="flex items-center justify-between text-sm"
                  >
                    <Badge
                      variant={
                        priority === "CRITICAL" || priority === "HIGH"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {priority}
                    </Badge>
                    <span className="font-montreal-medium">
                      {count as number}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks assigned</p>
          )}
        </div>
      </div>

      <div className="border">
        <div className="p-6 border-b">
          <h3 className="text-sm font-montreal-medium">Projects</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Projects where user is a member or client
          </p>
        </div>
        <div className="p-6">
          {user.projectMembers.length === 0 &&
          user.projectClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects associated
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.projectMembers.map((pm: any) => (
                  <TableRow key={`member-${pm.id}`}>
                    <TableCell className="font-medium">
                      {pm.project.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pm.project.status === "ACTIVE"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {pm.project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>Member</Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(pm.createdAt), "short")}
                    </TableCell>
                  </TableRow>
                ))}
                {user.projectClients.map((pc: any) => (
                  <TableRow key={`client-${pc.id}`}>
                    <TableCell className="font-medium">
                      {pc.project.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pc.project.status === "ACTIVE"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {pc.project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Client</Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(pc.createdAt), "short")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="border">
        <div className="p-6 border-b">
          <h3 className="text-sm font-montreal-medium">Recent Tasks</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Last 10 tasks assigned to this user
          </p>
        </div>
        <div className="p-6">
          {user.assignedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.assignedTasks.slice(0, 10).map((at: any) => (
                  <TableRow key={at.task.id}>
                    <TableCell className="font-medium">
                      {at.task.title}
                    </TableCell>
                    <TableCell>{at.task.project.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{at.task.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          at.task.priority === "CRITICAL" ||
                          at.task.priority === "HIGH"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {at.task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(at.task.createdAt), "short")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="border">
        <div className="p-6 border-b">
          <h3 className="text-sm font-montreal-medium">Recent Time Logs</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Last 10 time entries
          </p>
        </div>
        <div className="p-6">
          {user.timeLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time logs</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.timeLogs.slice(0, 10).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.task.title}
                    </TableCell>
                    <TableCell>{log.task.project.name}</TableCell>
                    <TableCell>{formatTaskTimeLogDuration(log.duration)}</TableCell>
                    <TableCell>
                      {formatDate(new Date(log.createdAt), "dateTime")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="border">
        <div className="flex items-center justify-between gap-4 border-b p-6">
          <div>
            <h3 className="text-sm font-montreal-medium">Recent Activity</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Latest actions performed by this user
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin?userId=${user.id}#activity-log`}>
              View all
            </Link>
          </Button>
        </div>
        <div className="p-6">
          {user.activityLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity recorded
            </p>
          ) : (
            <ul className="relative space-y-1 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-border">
              {user.activityLogs.slice(0, 15).map((log: any) => (
                <li key={log.id}>
                  <ActivityTimelineItem
                    activity={{
                      ...log,
                      user: {
                        id: user.id,
                        name: user.name,
                        image: user.image,
                      },
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border">
        <div className="p-6 border-b">
          <h3 className="text-sm font-montreal-medium">Recent Comments</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Last 10 comments by this user
          </p>
        </div>
        <div className="p-6">
          {user.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet</p>
          ) : (
            <div className="space-y-4">
              {user.comments.slice(0, 10).map((comment: any) => (
                <div key={comment.id} className="pl-4 border-l-2 space-y-1">
                  <p className="text-sm">{comment.body}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Task: {comment.task.title}</span>
                    <span>•</span>
                    <span>
                      {formatDate(new Date(comment.createdAt), "dateTime")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
