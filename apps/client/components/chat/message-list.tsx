"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MoreVertical } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { Message } from "@/lib/stores/chat.store";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "../ui/textarea";
import { Asset, AssetSheet } from "@/components/projects/asset-viewer";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
}

export function MessageList({
  messages,
  isLoading,
  onLoadMore,
  hasMore,
  onEdit,
  onDelete,
  onReply,
}: MessageListProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<Asset | null>(null);
  const [lastTapTime, setLastTapTime] = useState<{ [key: string]: number }>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);

    if (scrollTop < 100 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editingMessageId && onEdit) {
      onEdit(editingMessageId, editContent);
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleTouchReply = (message: Message) => {
    const now = Date.now();
    const lastTap = lastTapTime[message.id] || 0;
    if (now - lastTap < 300) {
      onReply?.(message);
      setLastTapTime((prev) => ({ ...prev, [message.id]: 0 }));
      return;
    }
    setLastTapTime((prev) => ({ ...prev, [message.id]: now }));
  };

  const handleJumpToReplyTarget = (replyToId: string) => {
    const target = messageRefs.current[replyToId];
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(replyToId);
    window.setTimeout(() => {
      setHighlightedMessageId((prev) => (prev === replyToId ? null : prev));
    }, 1400);
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hidden"
    >
      {isLoading && hasMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {messages.map((message, index) => {
        const showAvatar =
          index === 0 || messages[index - 1].userId !== message.userId;
        const showTimestamp =
          index === messages.length - 1 ||
          messages[index + 1].userId !== message.userId ||
          new Date(messages[index + 1].createdAt).getTime() -
            new Date(message.createdAt).getTime() >
            300000;

        const isEditing = editingMessageId === message.id;
        const isOwner = user?.id === message.userId;

        return (
          <div
            key={message.id}
            ref={(el) => {
              messageRefs.current[message.id] = el;
            }}
            className={cn(
              "flex gap-3 group rounded-xl transition-colors",
              !showAvatar && "mt-1",
              highlightedMessageId === message.id &&
                "bg-primary/10 transition-all duration-200 p-1.5",
            )}
          >
            {showAvatar ? (
              <UserAvatar
                alt={message.user?.name || "Unknown"}
                src={message.user?.image!}
              />
            ) : (
              <div className="w-10" />
            )}

            <div className="flex-1 min-w-0">
              {showAvatar && (
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {message.user?.name || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(new Date(message.createdAt), "custom", "p")}
                  </span>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    autoFocus
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="relative group/message"
                  onTouchEnd={(e) => {
                    if (e.touches.length === 0) {
                      handleTouchReply(message);
                    }
                  }}
                >
                  <div
                    className={cn(
                      "bg-muted rounded-xl p-2 wrap-break-word cursor-pointer",
                      message.replyTo && "",
                    )}
                    onDoubleClick={() => onReply?.(message)}
                  >
                    {message.mediaUrls && message.mediaUrls.length > 0 && (
                      <div
                        className={`mb-2 space-y-2 grid ${
                          message.mediaUrls.length > 1
                            ? "grid-cols-2 gap-2 max-w-xl"
                            : ""
                        }`}
                      >
                        {message.mediaUrls.map((url, idx) => {
                          const isImage =
                            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                          const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
                          const fileName = url.split("/").pop() || "Attachment";

                          const getFileType = () => {
                            if (isImage) {
                              const ext = url.split(".").pop()?.toLowerCase();
                              if (ext === "svg") return "image/svg+xml";
                              if (ext === "png") return "image/png";
                              if (ext === "gif") return "image/gif";
                              return "image/jpeg";
                            }
                            if (isVideo) return "video/mp4";
                            if (/\.pdf$/i.test(url)) return "application/pdf";
                            if (/\.mp3$/i.test(url)) return "audio/mpeg";
                            return "application/octet-stream";
                          };

                          if (isImage) {
                            return (
                              <button
                                key={idx}
                                onClick={() =>
                                  setSelectedMedia({
                                    id: `${message.id}-${idx}`,
                                    name: fileName,
                                    fileUrl: url,
                                    fileType: getFileType(),
                                    fileSize: 0,
                                    folder: null,
                                    tags: [],
                                    updatedAt: message.createdAt,
                                  })
                                }
                                className="relative block"
                              >
                                <img
                                  src={url}
                                  alt="Uploaded image"
                                  className="size-80 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              </button>
                            );
                          }

                          if (isVideo) {
                            return (
                              <button
                                key={idx}
                                onClick={() =>
                                  setSelectedMedia({
                                    id: `${message.id}-${idx}`,
                                    name: fileName,
                                    fileUrl: url,
                                    fileType: getFileType(),
                                    fileSize: 0,
                                    folder: null,
                                    tags: [],
                                    updatedAt: message.createdAt,
                                  })
                                }
                                className="relative block"
                              >
                                <video
                                  src={url}
                                  className="size-80 rounded-2xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  muted
                                />
                              </button>
                            );
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() =>
                                setSelectedMedia({
                                  id: `${message.id}-${idx}`,
                                  name: fileName,
                                  fileUrl: url,
                                  fileType: getFileType(),
                                  fileSize: 0,
                                  folder: null,
                                  tags: [],
                                  updatedAt: message.createdAt,
                                })
                              }
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              📎 {fileName}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {message.replyTo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToReplyTarget(message.replyTo!.id);
                        }}
                        className="mb-2 w-full text-left p-1.5 border-l-3 border-muted-foreground pl-2 text-xs text-muted-foreground dark:bg-neutral-700/50 bg-neutral-200 dark:hover:bg-neutral-600 rounded-sm transition-colors hover:bg-neutral-300/70"
                      >
                        <p className="font-medium">
                          {message.replyTo.user?.name || "Unknown"}
                        </p>
                        <p className="truncate">{message.replyTo.content}</p>
                      </button>
                    )}

                    <div className="flex items-center">
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content.includes("@")
                          ? message.content.split(" ").map((word, idx) => {
                              if (word.startsWith("@")) {
                                const mention = word.substring(1);
                                return (
                                  <span
                                    key={idx}
                                    className="text-destructive font-medium"
                                  >
                                    @{mention}{" "}
                                  </span>
                                );
                              }
                              return word + " ";
                            })
                          : message.content}
                      </p>
                      {message.isEdited && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (edited)
                        </span>
                      )}
                    </div>
                  </div>

                  {(isOwner || true) && (
                    <div className="absolute top-4 right-3 -mt-2 -mr-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onReply?.(message)}>
                            Reply
                          </DropdownMenuItem>
                          {isOwner && (
                            <>
                              <DropdownMenuItem
                                onSelect={() => handleEdit(message)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => onDelete?.(message.id)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              )}

              {showTimestamp && !isEditing && (
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(new Date(message.createdAt), "custom", "PPp")}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <AssetSheet
        asset={selectedMedia}
        open={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}
