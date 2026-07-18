import { http } from "./http";

export type ChannelType =
  | "ALL"
  | "PROJECT_MANAGERS"
  | "PROJECT_DEV_PM"
  | "PROJECT_CLIENT_PM"
  | "PROJECT_CLIENT_ADMIN"
  | "ANNOUNCEMENT";

export type CreateChannelPayload = {
  name: string;
  description?: string;
  type: ChannelType;
  projectId?: string;
};

export type UpdateChannelPayload = {
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type SendMessagePayload = {
  content: string;
  mediaUrls?: string[];
  mentions?: string[];
  replyToId?: string;
};

export class ChannelsApi {
  async list(projectId?: string) {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const q = params.toString();
    const { data } = await http.get(`/api/channels${q ? `?${q}` : ""}`);
    return data;
  }

  async get(channelId: string) {
    const { data } = await http.get(`/api/channels/${channelId}`);
    return data;
  }

  async create(payload: CreateChannelPayload) {
    const { data } = await http.post("/api/channels", payload);
    return data;
  }

  async update(channelId: string, payload: UpdateChannelPayload) {
    const { data } = await http.patch(`/api/channels/${channelId}`, payload);
    return data;
  }

  async remove(channelId: string) {
    const { data } = await http.delete(`/api/channels/${channelId}`);
    return data;
  }

  async members(channelId: string) {
    const { data } = await http.get(`/api/channels/${channelId}/members`);
    return data;
  }

  async markRead(channelId: string) {
    const { data } = await http.patch(`/api/channels/${channelId}/read`);
    return data;
  }

  async listMessages(
    channelId: string,
    options?: { before?: string; after?: string; limit?: number },
  ) {
    const params = new URLSearchParams();
    if (options?.before) params.set("before", options.before);
    if (options?.after) params.set("after", options.after);
    if (options?.limit) params.set("limit", String(options.limit));
    const q = params.toString();
    const { data } = await http.get(
      `/api/channels/${channelId}/messages${q ? `?${q}` : ""}`,
    );
    return data;
  }

  async sendMessage(channelId: string, payload: SendMessagePayload) {
    const { data } = await http.post(
      `/api/channels/${channelId}/messages`,
      payload,
    );
    return data;
  }

  async updateMessage(channelId: string, messageId: string, content: string) {
    const { data } = await http.patch(
      `/api/channels/${channelId}/messages/${messageId}`,
      { content },
    );
    return data;
  }

  async deleteMessage(channelId: string, messageId: string) {
    const { data } = await http.delete(
      `/api/channels/${channelId}/messages/${messageId}`,
    );
    return data;
  }
}

export const channelsApi = new ChannelsApi();
