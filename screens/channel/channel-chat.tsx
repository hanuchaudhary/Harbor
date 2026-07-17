"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-chat";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Message } from "@/lib/stores/chat.store";
import { ChannelQueries } from "@/lib/query/query.func";
import { useQuery } from "@tanstack/react-query";
import UserAvatar from "@/components/user-avatar";

export default function ChannelChat({ channelId }: { channelId: string }) {
  const { role } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ChannelQueries.keys.members(channelId || ""),
    queryFn: () => ChannelQueries.fetchMembers(channelId || ""),
    enabled: !!channelId,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    messageId: string | null;
  }>({ open: false, messageId: null });

  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    user?: { name: string };
  } | null>(null);
  const {
    channels,
    messages,
    hasMore,
    isLoading,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useChat(channelId, true);

  const handleRefetch = async () => {
    await fetchMessages();
  };

  const handleSendMessage = async (
    content: string,
    options?: {
      mediaUrls?: string[];
      mentions?: string[];
      replyToId?: string;
    },
  ) => {
    await sendMessage(content, options);
    setReplyingTo(null);
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    await editMessage(messageId, content);
  };

  const handleDeleteMessage = async (messageId: string) => {
    setDeleteConfirm({ open: true, messageId });
  };

  const handleReplyMessage = (message: Message) => {
    setReplyingTo({
      id: message.id,
      content: message.content,
      user: { name: message.user?.name! },
    });
  };

  const currentChannel = channels.find((c) => c.id === channelId);
  const isAnnouncementChannel =
    currentChannel?.type === "ANNOUNCEMENT" && role !== "ADMIN";
  if (!currentChannel && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg mb-2">Channel not found</p>
          <p className="text-sm text-muted-foreground">
            The channel you are looking for does not exist or you do not have
            access to it
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] -mx-12 -my-14 overflow-hidden grid grid-cols-3">
      <div className="flex flex-col h-full col-span-2 overflow-y-auto">
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{currentChannel?.name}</h2>
            {currentChannel?.description && (
              <p className="text-sm text-muted-foreground">
                {currentChannel.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefetch}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        <MessageList
          messages={messages}
          isLoading={isLoading}
          onLoadMore={() => {}} // todo handleLoadMore
          hasMore={hasMore}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onReply={handleReplyMessage}
        />

        <MessageInput
          members={members}
          channelId={channelId}
          onSend={handleSendMessage}
          disabled={isAnnouncementChannel}
          replyingTo={replyingTo}
          onClearReply={() => setReplyingTo(null)}
          placeholder={
            isAnnouncementChannel
              ? "Only admins can post announcements"
              : "Type a message..."
          }
        />
      </div>
      <div className="h-full border-l flex flex-col overflow-hidden">
        <div className="border-b px-4 py-7 shrink-0 bg-sidebar">
          <h2 className="text-base font-semibold">
            Members ({members.length})
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y scrollbar-hidden">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 py-2 px-4 justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserAvatar
                  alt={member.name}
                  src={member.image!}
                  size="default"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
              </div>
              {member.lastSeenAt &&
              new Date(member.lastSeenAt) >
                new Date(Date.now() - 5 * 60 * 1000) ? (
                <span className="h-2 w-2 bg-emerald-500 rounded-full shrink-0" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          !open && setDeleteConfirm({ open: false, messageId: null })
        }
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        onConfirm={async () => {
          if (deleteConfirm.messageId) {
            await deleteMessage(deleteConfirm.messageId);
          }
          setDeleteConfirm({ open: false, messageId: null });
        }}
        variant="destructive"
      />
    </div>
  );
}
