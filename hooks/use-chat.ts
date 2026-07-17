import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChannelQueries,
  MessageQueries,
  Message,
} from "@/lib/query/query.func";


export function useChat(channelId?: string, enablePolling: boolean = false) {
  const queryClient = useQueryClient();

  const {
    data: channels = [],
    isLoading: isLoadingChannels,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ChannelQueries.keys.all(),
    queryFn: () => ChannelQueries.fetchAll(),
    staleTime: 1000 * 30, // 30 seconds
  });

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: MessageQueries.keys.byChannel(channelId || ""),
    queryFn: () =>
      channelId
        ? MessageQueries.fetchByChannel(channelId, { limit: 50 })
        : Promise.resolve({ messages: [], hasMore: false }),
    enabled: !!channelId,
    staleTime: 1000 * 10,
    refetchInterval: enablePolling ? 10000 : false,
  });

  const messages = messagesData?.messages || [];
  const hasMore = messagesData?.hasMore || false;

  useEffect(() => {
    if (!channelId) return;
    ChannelQueries.markRead(channelId).then(() => {
      queryClient.invalidateQueries({ queryKey: ChannelQueries.keys.all() });
    });
  }, [channelId]);

  const sendMessageMutation = useMutation({
    mutationFn: ({
      channelId,
      ...payload
    }: { channelId: string } & Parameters<typeof MessageQueries.send>[1]) =>
      MessageQueries.send(channelId, payload),
    onSuccess: (newMessage, variables) => {
      if (channelId) {
        queryClient.setQueryData<{ messages: Message[]; hasMore: boolean }>(
          MessageQueries.keys.byChannel(channelId),
          (old) => {
            const existingMessages = old?.messages || [];
            let replyTo: Message["replyTo"] = null;

            if (newMessage.replyToId) {
              const parentMessage = existingMessages.find(
                (m) => m.id === newMessage.replyToId,
              );
              if (parentMessage) {
                replyTo = {
                  id: parentMessage.id,
                  content: parentMessage.content,
                  user: parentMessage.user
                    ? {
                        id: parentMessage.user.id,
                        name: parentMessage.user.name,
                        email: parentMessage.user.email,
                        image: parentMessage.user.image,
                      }
                    : undefined,
                };
              }
            }

            const messageWithReply: Message = {
              ...newMessage,
              replyTo,
            };

            return {
              messages: [...existingMessages, messageWithReply],
              hasMore: old?.hasMore || false,
            };
          },
        );
      }
    },
    onError: () => toast.error("Failed to send message"),
  });

  const editMessageMutation = useMutation({
    mutationFn: ({
      channelId,
      messageId,
      content,
    }: {
      channelId: string;
      messageId: string;
      content: string;
    }) => MessageQueries.update(channelId, messageId, content),
    onSuccess: (updatedMessage, variables) => {
      queryClient.setQueryData<{ messages: Message[]; hasMore: boolean }>(
        MessageQueries.keys.byChannel(variables.channelId),
        (old) => ({
          messages: (old?.messages || []).map((msg) =>
            msg.id === variables.messageId ? updatedMessage : msg,
          ),
          hasMore: old?.hasMore || false,
        }),
      );
    },
    onError: () => toast.error("Failed to edit message"),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: ({
      channelId,
      messageId,
    }: {
      channelId: string;
      messageId: string;
    }) => MessageQueries.delete(channelId, messageId),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<{ messages: Message[]; hasMore: boolean }>(
        MessageQueries.keys.byChannel(variables.channelId),
        (old) => ({
          messages: (old?.messages || []).filter(
            (msg) => msg.id !== variables.messageId,
          ),
          hasMore: old?.hasMore || false,
        }),
      );
    },
    onError: () => toast.error("Failed to delete message"),
  });

  const createChannelMutation = useMutation({
    mutationFn: ChannelQueries.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ChannelQueries.keys.all() });
      toast.success("Channel created");
    },
    onError: () => toast.error("Failed to create channel"),
  });

  return {
    channels,
    messages,
    hasMore,
    currentChannelId: channelId,

    isLoading: isLoadingChannels || isLoadingMessages,
    isLoadingChannels,
    isLoadingMessages,
    isPolling: enablePolling,

    fetchChannels: refetchChannels,
    fetchMessages: refetchMessages,
    sendMessage: (
      content: string,
      options?: Omit<Parameters<typeof MessageQueries.send>[1], "content">,
    ) =>
      channelId
        ? sendMessageMutation.mutateAsync({ channelId, content, ...options })
        : Promise.reject(),
    editMessage: (messageId: string, content: string) =>
      channelId
        ? editMessageMutation.mutateAsync({ channelId, messageId, content })
        : Promise.reject(),
    deleteMessage: (messageId: string) =>
      channelId
        ? deleteMessageMutation.mutateAsync({ channelId, messageId })
        : Promise.reject(),
    createChannel: createChannelMutation.mutateAsync,

    sendMessageMutation,
    editMessageMutation,
    deleteMessageMutation,
    createChannelMutation,
  };
}
