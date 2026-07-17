import { create } from "zustand";

export type ChannelType =
  | "ALL"
  | "PROJECT_MANAGERS"
  | "PROJECT_DEV_PM"
  | "PROJECT_CLIENT_PM"
  | "PROJECT_CLIENT_ADMIN"
  | "ANNOUNCEMENT";

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  projectId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    messages: number;
  };
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  mediaUrls?: string[];
  isEdited: boolean;
  replyToId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role: string;
  };
  replyTo?: {
    id: string;
    content: string;
    user?: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
  } | null;
  mentions?: {
    id: string;
    mentionedId: string;
    isRead: boolean;
  }[];
}

interface ChatState {
  channels: Channel[];
  currentChannelId: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  isPolling: boolean;
  lastFetchTime: Record<string, number>;

  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;

  setCurrentChannel: (channelId: string | null) => void;

  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (
    channelId: string,
    messageId: string,
    updates: Partial<Message>,
  ) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;

  setIsLoading: (isLoading: boolean) => void;
  setIsPolling: (isPolling: boolean) => void;

  clearChannelMessages: (channelId: string) => void;
  clearAllMessages: () => void;

  markChannelAsRead: (channelId: string) => void;

  updateLastFetchTime: (channelId: string) => void;
  getLastFetchTime: (channelId: string) => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  currentChannelId: null,
  messages: {},
  isLoading: false,
  isPolling: false,
  lastFetchTime: {},

  setChannels: (channels) => set({ channels }),

  addChannel: (channel) =>
    set((state) => ({
      channels: [...state.channels, channel],
    })),

  updateChannel: (channelId, updates) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, ...updates } : c,
      ),
    })),

  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      currentChannelId:
        state.currentChannelId === channelId ? null : state.currentChannelId,
    })),

  setCurrentChannel: (channelId) => set({ currentChannelId: channelId }),

  setMessages: (channelId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: messages,
      },
    })),

  addMessage: (channelId, message) =>
    set((state) => {
      const existingMessages = state.messages[channelId] || [];
      const messageExists = existingMessages.some((m) => m.id === message.id);

      if (messageExists) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [channelId]: [...existingMessages, message],
        },
      };
    }),

  updateMessage: (channelId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m,
        ),
      },
    })),

  removeMessage: (channelId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).filter(
          (m) => m.id !== messageId,
        ),
      },
    })),

  prependMessages: (channelId, messages) =>
    set((state) => {
      const existingMessages = state.messages[channelId] || [];
      const existingIds = new Set(existingMessages.map((m) => m.id));
      const newMessages = messages.filter((m) => !existingIds.has(m.id));

      return {
        messages: {
          ...state.messages,
          [channelId]: [...newMessages, ...existingMessages],
        },
      };
    }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setIsPolling: (isPolling) => set({ isPolling }),

  clearChannelMessages: (channelId) =>
    set((state) => {
      const messages = { ...state.messages };
      delete messages[channelId];
      return { messages };
    }),

  clearAllMessages: () => set({ messages: {} }),

  markChannelAsRead: (channelId) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, unreadCount: 0 } : c,
      ),
    })),

  updateLastFetchTime: (channelId) =>
    set((state) => ({
      lastFetchTime: {
        ...state.lastFetchTime,
        [channelId]: Date.now(),
      },
    })),

  getLastFetchTime: (channelId) => {
    return get().lastFetchTime[channelId] || 0;
  },
}));
