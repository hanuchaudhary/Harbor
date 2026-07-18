"use client";

import { useState, useRef, KeyboardEvent, useMemo, useEffect } from "react";
import { flushSync } from "react-dom";
import { Send, Paperclip, X, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { Member } from "@/types/types";
import UserAvatar from "@/components/user-avatar";
import { http as axios } from "@/lib/api/http";

interface MessageInputProps {
  members: Member[];
  channelId?: string;
  onSend: (
    content: string,
    options?: {
      mediaUrls?: string[];
      mentions?: string[];
      replyToId?: string;
    },
  ) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  replyingTo?: { id: string; content: string; user?: { name: string } } | null;
  onClearReply?: () => void;
}

export function MessageInput({
  channelId,
  onSend,
  members,
  disabled,
  replyingTo,
  onClearReply,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{
      file: File;
      url: string;
      uploading: boolean;
    }>
  >([]);
  const [isSending, setIsSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const filtered = members
      .filter(
        (m: Member) =>
          m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
      )
      .slice(0, 5);

    if ("all".includes(q)) {
      return [
        {
          id: "@all",
          name: "all",
          email: "Mention everyone",
          image: null,
        } as any,
        ...filtered,
      ];
    }
    return filtered;
  }, [mentionQuery, members]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionSuggestions.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const selectMention = (member: Member | any) => {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const before = content.slice(0, cursor);
    const after = content.slice(cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const displayName =
        member.id === "@all" ? "All" : member.name.split(" ")[0];
      const newText = before.slice(0, match.index) + `@${displayName} ` + after;
      setContent(newText);
      setMentionIds((prev) => [
        ...prev.filter((id) => id !== member.id),
        member.id,
      ]);
    }
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments = files.map((file) => ({
      file,
      url: "",
      uploading: true,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const index = attachments.length + i;

      try {
        const ext = file.name.split(".").pop() ?? "";
        const key = `chat/${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? `.${ext}` : ""}`;

        const { data } = await axios.post<{
          presignedUrl: string;
          fileUrl: string;
        }>("/api/upload/presigned", {
          key,
          contentType: file.type,
        });

        await axios.put(data.presignedUrl, file, {
          headers: { "Content-Type": file.type },
        });

        setAttachments((prev) =>
          prev.map((att, idx) =>
            idx === index
              ? { ...att, url: data.fileUrl, uploading: false }
              : att,
          ),
        );
      } catch (error) {
        console.error("Failed to upload file:", error);
        setAttachments((prev) => prev.filter((_, idx) => idx !== index));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && attachments.length === 0) return;

    const hasUploadingAttachments = attachments.some((att) => att.uploading);
    if (hasUploadingAttachments) return;

    setIsSending(true);
    try {
      await onSend(trimmedContent, {
        mediaUrls: attachments.map((att) => att.url),
        mentions: mentionIds,
        replyToId: replyingTo?.id,
      });

      setContent("");
      setAttachments([]);
      setMentionIds([]);
      onClearReply?.();
      flushSync(() => setIsSending(false));
      textareaRef.current?.focus();
    } catch (error) {
      setIsSending(false);
      console.error("Failed to send message:", error);
    }
  };

  const canSend =
    (content.trim() || attachments.length > 0) &&
    !isSending &&
    !attachments.some((att) => att.uploading);

  return (
    <div className="border-t bg-background p-4">
      <AnimatePresence initial={false}>
        {replyingTo && (
          <motion.div
            key={replyingTo.id}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mb-3 overflow-hidden"
          >
            <div className="pb-3 border-l-3 border-primary pl-3 flex items-start justify-between bg-muted/50 p-2 rounded">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">
                  Replying to {replyingTo.user?.name || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {replyingTo.content}
                </p>
              </div>
              <button
                onClick={onClearReply}
                className="ml-2 p-1 hover:bg-background rounded-sm shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative flex items-center gap-2 bg-muted rounded-md p-2 pr-8"
            >
              {attachment.uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              <span className="text-sm truncate max-w-37.5">
                {attachment.file.name}
              </span>
              <button
                onClick={() => handleRemoveAttachment(index)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded-sm"
                disabled={attachment.uploading}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />

        <Button
          variant="secondary"
          className="size-11"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Type a message… use @ to mention"}
            disabled={disabled || isSending}
            className={cn(
              "min-h-11 max-h-50 resize-none",
              "focus-visible:ring-1",
            )}
            rows={1}
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
                  {m.id === "@all" ? (
                    <div className="size-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold">
                      👥
                    </div>
                  ) : (
                    <UserAvatar src={m.image!} alt={m.name} size="sm" />
                  )}
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
          onClick={handleSend}
          disabled={!canSend || disabled}
          size="icon"
          className="size-11"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
