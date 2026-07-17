"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { IconLoader2, IconSend } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  CommentQueries,
  HistoryQueries,
  ActivityLogQueries,
  TaskQueries,
} from "@/lib/query/query.func";
import { type ActivityLog, type Member, TASK_STATUS } from "@/types/types";
import { statusLabel } from "../constants";
import { formatDate, cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/auth.client";
import UserAvatar from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActivityTimelineItem } from "@/components/activity/activity-timeline-item";

const STATUS_COLOR: Record<TASK_STATUS, string> = {
  DISCUSSION: "bg-muted-foreground",
  IN_PLANNING: "bg-blue-400",
  TODO: "bg-zinc-400",
  DESIGN: "bg-cyan-500",
  DEVELOPMENT: "bg-violet-500",
  REVIEW: "bg-amber-400",
  CLIENT_REVIEW: "bg-orange-400",
  ON_HOLD: "bg-yellow-400",
  COMPLETED: "bg-emerald-500",
};

function renderBody(body: string) {
  return body.split(/(@\S+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-blue-500 font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

interface CommentsTabProps {
  taskId: string;
  projectSlug: string;
  allMembers: Member[];
}

export function CommentsTab({
  taskId,
  projectSlug,
  allMembers,
}: CommentsTabProps) {
  const { data: comments = [] } = useQuery({
    queryKey: CommentQueries.keys.byTask(taskId),
    queryFn: () => CommentQueries.fetchByTask(taskId),
  });

  const { data: history = [] } = useQuery({
    queryKey: HistoryQueries.keys.byTask(taskId),
    queryFn: () => HistoryQueries.fetchByTask(taskId),
  });

  const {
    data: activityData,
    fetchNextPage: fetchNextActivityPage,
    hasNextPage: hasMoreActivity,
    isFetchingNextPage: isFetchingMoreActivity,
    isError: isActivityError,
    refetch: refetchActivity,
  } = useInfiniteQuery({
    queryKey: ActivityLogQueries.keys.byTask(taskId),
    queryFn: ({ pageParam }) =>
      ActivityLogQueries.fetchByTask(
        projectSlug,
        taskId,
        pageParam as string | undefined,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const activityLogs =
    activityData?.pages.flatMap((page) => page.activityLogs) ?? [];

  const queryClient = useQueryClient();
  const session = authClient.useSession().data;
  const currentUserId = session?.user?.id;

  const { data: task } = useQuery({
    queryKey: TaskQueries.keys.detail(taskId),
    queryFn: () => TaskQueries.fetchByIdWithCounts(taskId),
    select: (data) => data?.task,
  });

  const [commentBody, setCommentBody] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return allMembers
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [mentionQuery, allMembers]);
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSuggestions.length]);

  type FeedItem =
    | {
        kind: "comment";
        id: string;
        createdAt: string;
        data: (typeof comments)[0];
      }
    | {
        kind: "status";
        id: string;
        createdAt: string;
        data: (typeof history)[0];
      }
    | {
        kind: "activity";
        id: string;
        createdAt: string;
        data: ActivityLog;
      };

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...comments.map((c: any) => ({
        kind: "comment" as const,
        id: c.id,
        createdAt: c.createdAt,
        data: c,
      })),
      ...history.map((h: any) => ({
        kind: "status" as const,
        id: h.id,
        createdAt: h.createdAt,
        data: h,
      })),
      ...(activityLogs || [])
        .filter(
          (activity: ActivityLog) =>
            ![
              "TASK_STATUS_CHANGED",
              "TASK_COMPLETED",
              "TASK_REOPENED",
            ].includes(activity.action),
        )
        .map((a: ActivityLog) => ({
          kind: "activity" as const,
          id: a.id,
          createdAt: a.createdAt,
          data: a,
        })),
    ];
    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [comments, history, activityLogs]);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: CommentQueries.keys.byTask(taskId),
    });
  };

  const addComment = useMutation({
    mutationFn: ({ body, ids }: { body: string; ids: string[] }) =>
      CommentQueries.create(taskId, body, ids),
    onSuccess: () => {
      setCommentBody("");
      setMentionIds([]);
      invalidate();
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const updateComment = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      CommentQueries.update(taskId, id, body),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: () => toast.error("Failed to update comment"),
  });

  const deleteComment = useMutation({
    mutationFn: (id: string) => CommentQueries.delete(taskId, id),
    onSuccess: invalidate,
    onError: () => toast.error("Failed to delete comment"),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCommentBody(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const selectMention = (member: Member) => {
    const cursor = inputRef.current?.selectionStart ?? commentBody.length;
    const before = commentBody.slice(0, cursor);
    const after = commentBody.slice(cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const firstName = member.name.split(" ")[0];
      const newText = before.slice(0, match.index) + `@${firstName} ` + after;
      setCommentBody(newText);
      setMentionIds((prev) => [
        ...prev.filter((id) => id !== member.id),
        member.id,
      ]);
    }
    setMentionQuery(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = () => {
    const trimmed = commentBody.trim();
    if (!trimmed) return;
    addComment.mutate({ body: trimmed, ids: mentionIds });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="relative flex items-center gap-2">
        <UserAvatar
          src={session?.user?.image!}
          alt={session?.user?.name!}
          size="sm"
        />
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Write a comment… use @ to mention"
            value={commentBody}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              // Handle mention navigation with arrow keys
              if (mentionQuery !== null && mentionSuggestions.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((prev) =>
                    prev < mentionSuggestions.length - 1 ? prev + 1 : 0,
                  );
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : mentionSuggestions.length - 1,
                  );
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  selectMention(mentionSuggestions[selectedIndex]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionQuery(null);
                  return;
                }
              }

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          {mentionQuery !== null && mentionSuggestions.length > 0 && (
            <div className="absolute left-0 bottom-full mb-1 z-50 bg-popover border shadow-md min-w-56 overflow-hidden">
              {mentionSuggestions.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(m);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <UserAvatar src={m.image!} alt={m.name} size="sm" />
                  <span className="flex-1 truncate font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground/70 truncate">
                    {m.email}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          onClick={submit}
          disabled={!commentBody.trim() || addComment.isPending}
        >
          <IconSend className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isActivityError && (
        <div className="flex items-center justify-between gap-3 border px-3 py-2 text-sm text-muted-foreground">
          <span>Some task activity could not be loaded.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchActivity()}
          >
            Retry
          </Button>
        </div>
      )}

      {feed.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No activity yet
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-3 bottom-3 w-px bg-border" />
          <div className="space-y-4">
            {feed.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className={cn(
                  "relative",
                  item.kind !== "activity" && "flex items-start gap-3",
                )}
              >
                {item.kind === "status" ? (
                  <>
                    <div className="relative z-10">
                      <span
                        className={`block h-6 w-6 rounded-full shrink-0 ${STATUS_COLOR[item.data.to as TASK_STATUS]}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm leading-snug">
                        <span className="text-muted-foreground">
                          Status changed to{" "}
                        </span>
                        <span className="font-medium text-foreground">
                          {statusLabel[item.data.to as TASK_STATUS]}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </>
                ) : item.kind === "activity" ? (
                  <ActivityTimelineItem
                    activity={item.data}
                    showCategory={false}
                  />
                ) : (
                  <>
                    <div className="relative z-10 ring-2 ring-background rounded-full">
                      <UserAvatar
                        src={item.data.user.image || ""}
                        alt={item.data.user.name}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0 group">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <Input
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editBody.trim())
                                updateComment.mutate({
                                  id: item.id,
                                  body: editBody.trim(),
                                });
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              updateComment.mutate({
                                id: item.id,
                                body: editBody.trim(),
                              })
                            }
                            disabled={
                              !editBody.trim() || updateComment.isPending
                            }
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium leading-snug">
                              {item.data.user.name}
                            </span>
                            {item.data.isEdited && (
                              <span className="text-xs text-muted-foreground/50 italic">
                                (edited)
                              </span>
                            )}
                            {currentUserId === item.data.user.id && (
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-auto transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditBody(item.data.body);
                                  }}
                                  className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteComment.mutate(item.id)}
                                  className="text-xs text-muted-foreground hover:text-destructive px-1 py-0.5 rounded hover:bg-muted transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-snug">
                            {renderBody(item.data.body)}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {hasMoreActivity && (
        <div className="flex justify-center border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextActivityPage()}
            disabled={isFetchingMoreActivity}
          >
            {isFetchingMoreActivity && (
              <IconLoader2 className="mr-2 size-3.5 animate-spin" />
            )}
            Load older activity
          </Button>
        </div>
      )}
    </div>
  );
}
