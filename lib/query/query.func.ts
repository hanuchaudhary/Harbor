import axios from "axios";
import { z } from "zod";

import { projectSchema, InviteType } from "@/validations/validation";
import {
  Member,
  Project,
  Tag,
  Task,
  TaskAttachment,
} from "@/types/types";

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<{ presignedUrl: string; fileUrl: string }> {
  const { data } = await axios.post("/api/upload/presigned", {
    key,
    contentType,
  });
  return data;
}

export async function uploadToR2(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "";
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? `.${ext}` : ""}`;
  const { presignedUrl, fileUrl } = await getPresignedUploadUrl(key, file.type);
  await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  return fileUrl;
}

type ProjectFormValues = z.input<typeof projectSchema>;

type ProjectCreateDocInput = {
  title: string;
  content?: string;
};

type ProjectCreateAssetInput = {
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  tags?: string[];
};

type ProjectCreateMilestoneInput = {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";
};

type ProjectCreatePayload = ProjectFormValues & {
  docs?: ProjectCreateDocInput[];
  milestones?: ProjectCreateMilestoneInput[];
  assets?: ProjectCreateAssetInput[];
};

type ProjectUpdatePayload = Partial<ProjectCreatePayload>;

export abstract class ProjectQueries {
  static keys = {
    all: () => ["projects"] as const,
    detail: (slug: string) => ["project", slug] as const,
  };

  static async fetchAll(): Promise<Project[]> {
    const { data } = await axios.get("/api/projects?limit=200");
    return data.projects ?? [];
  }

  static async create(payload: ProjectCreatePayload) {
    const { data } = await axios.post("/api/projects", payload);
    return data;
  }

  static async fetchBySlug(slug: string) {
    const { data } = await axios.get(`/api/projects/${slug}`);
    return data.project ?? null;
  }

  static async update(slug: string, payload: ProjectUpdatePayload) {
    const { data } = await axios.patch(`/api/projects/${slug}`, payload);
    return data;
  }

  static async addMember(
    slug: string,
    userIds: string[],
    type: "member" | "client" = "member",
  ) {
    const { data } = await axios.post(`/api/projects/${slug}/members`, {
      userIds,
      type,
    });
    return data;
  }

  static async removeMember(
    slug: string,
    userId: string,
    type: "member" | "client" = "member",
  ) {
    const { data } = await axios.delete(
      `/api/projects/${slug}/members?userId=${userId}&type=${type}`,
    );
    return data;
  }
}

type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";

export abstract class MilestoneQueries {
  static async updateStatus(
    projectSlug: string,
    milestoneId: string,
    status: MilestoneStatus,
  ) {
    const { data } = await axios.patch(
      `/api/projects/${projectSlug}/milestones/${milestoneId}`,
      { status },
    );
    return data;
  }

  static async update(
    projectSlug: string,
    milestoneId: string,
    payload: Partial<{
      title: string;
      description: string;
      status: MilestoneStatus;
      startDate: string;
      endDate: string;
    }>,
  ) {
    const { data } = await axios.patch(
      `/api/projects/${projectSlug}/milestones/${milestoneId}`,
      payload,
    );
    return data;
  }
}

export abstract class InviteQueries {
  static keys = {
    all: () => ["invites"] as const,
    list: (page: number, search: string, role: string, used: string) =>
      ["invites", page, search, role, used] as const,
  };

  static async fetchList(
    page: number,
    search: string,
    role: string,
    used: string,
  ) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
      ...(role && { role }),
      ...(used && { used }),
    });
    const { data } = await axios.get(`/api/invite?${params}`);
    return data;
  }

  static async create(payload: InviteType) {
    const { data } = await axios.post("/api/invite", payload);
    return data;
  }
}

export abstract class UserQueries {
  static keys = {
    all: () => ["users"] as const,
    members: () => ["users", "members"] as const,
    list: (page: number, search: string, role: string) =>
      ["users", page, search, role] as const,
    detail: (userId: string) => ["user", userId] as const,
  };

  static async fetchList(page: number, search: string, role: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "10",
      ...(search && { search }),
      ...(role && { role }),
    });
    const { data } = await axios.get(`/api/users?${params}`);
    return data;
  }

  static async fetchById(userId: string) {
    const { data } = await axios.get(`/api/admin/users/${userId}`);
    return data;
  }

  static async updateUser(
    userId: string,
    payload: { role?: string; isActive?: boolean },
  ) {
    const { data } = await axios.patch(`/api/users/${userId}`, payload);
    return data;
  }

  static async deleteUser(userId: string) {
    const { data } = await axios.delete(`/api/users/${userId}`);
    return data;
  }
}

type TaskCreatePayload = {
  title: string;
  description?: string;
  projectId: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  assigneeIds?: string[];
  clientIds?: string[];
  tagIds?: string[];
};

type TaskUpdatePayload = Partial<Omit<TaskCreatePayload, "projectId">> & {
  order?: number;
  progressPct?: number;
  milestoneId?: string | null;
  tagIds?: string[];
  assigneeIds?: string[];
};

export interface TaskPaginatedResponse {
  tasks: Task[];
  cursors: Record<string, string | undefined>;
  hasMore: Record<string, boolean>;
  counts: Record<string, number>;
}

export abstract class TaskQueries {
  static keys = {
    all: () => ["tasks"] as const,
    byProject: (projectId: string) => ["tasks", projectId] as const,
    filtered: (projectId: string, status: string, priority: string) =>
      ["tasks", projectId, status, priority] as const,
    detail: (taskId: string) => ["task", taskId] as const,
    paginated: (limitPerStatus: number) => ["tasks", "paginated", limitPerStatus] as const,
  };

  static async fetchAll(
    projectId?: string,
    status?: string,
    priority?: string,
  ): Promise<Task[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    const query = params.toString();
    const { data } = await axios.get(`/api/tasks${query ? `?${query}` : ""}`);
    return data.tasks ?? [];
  }

  static async fetchPaginated(
    limitPerStatus: number,
    options?: {
      projectId?: string;
      priority?: string;
      cursors?: Record<string, string>;
    }
  ): Promise<TaskPaginatedResponse> {
    const params = new URLSearchParams();
    params.set("limitPerStatus", limitPerStatus.toString());
    if (options?.projectId) params.set("projectId", options.projectId);
    if (options?.priority) params.set("priority", options.priority);
    if (options?.cursors) {
      const statuses = Object.keys(options.cursors);
      const cursorValues = statuses.map((s) => options.cursors![s]);
      params.set("cursorStatus", statuses.join(","));
      params.set("cursor", cursorValues.join(","));
    }
    const { data } = await axios.get(`/api/tasks?${params.toString()}`);
    return {
      tasks: data.tasks ?? [],
      cursors: data.cursors ?? {},
      hasMore: data.hasMore ?? {},
      counts: data.counts ?? {},
    };
  }

  static async fetchMoreByStatus(
    status: string,
    cursor: string,
    limit: number,
    options?: {
      projectId?: string;
      priority?: string;
    }
  ): Promise<{ tasks: Task[]; cursor?: string; hasMore: boolean; count: number }> {
    const params = new URLSearchParams();
    params.set("status", status);
    params.set("limitPerStatus", limit.toString());
    params.set("cursor", cursor);
    if (options?.projectId) params.set("projectId", options.projectId);
    if (options?.priority) params.set("priority", options.priority);
    const { data } = await axios.get(`/api/tasks?${params.toString()}`);
    return {
      tasks: data.tasks ?? [],
      cursor: data.cursors?.[status],
      hasMore: data.hasMore?.[status] ?? false,
      count: data.counts?.[status] ?? 0,
    };
  }

  static async create(payload: TaskCreatePayload): Promise<Task> {
    const { data } = await axios.post("/api/tasks", payload);
    return data.task;
  }

  static async fetchById(taskId: string): Promise<Task> {
    const { data } = await axios.get(`/api/tasks/${taskId}`);
    return data.task;
  }

  static async fetchByIdWithCounts(taskId: string) {
    const { data } = await axios.get(`/api/tasks/${taskId}`);
    return data;
  }

  static async update(
    taskId: string,
    payload: TaskUpdatePayload,
  ): Promise<Task> {
    try {
      const { data } = await axios.patch(`/api/tasks/${taskId}`, payload);
      return data.task;
    } catch (error: any) {
      throw new Error(error.response?.data.message || "Failed to update task");
    }
  }

  static async delete(taskId: string) {
    const { data } = await axios.delete(`/api/tasks/${taskId}`);
    return data;
  }

  static async reorder(
    updates: { id: string; order: number; status?: string }[],
  ): Promise<void> {
    try {
      await axios.patch("/api/tasks/reorder", { updates });
    } catch (error: any) {
      throw new Error(
        error.response?.data.message || "Failed to reorder tasks",
      );
    }
  }

  static async updateAssignees(taskId: string, assigneeIds: string[]) {
    const { data } = await axios.patch(`/api/tasks/${taskId}/assignees`, {
      assigneeIds,
    });
    return data;
  }

  static async updateTags(taskId: string, tagIds: string[]) {
    const { data } = await axios.patch(`/api/tasks/${taskId}/tags`, {
      tagIds,
    });
    return data;
  }
}

export abstract class CommentQueries {
  static keys = {
    byTask: (taskId: string) => ["comments", taskId] as const,
  };

  static async fetchByTask(taskId: string) {
    const { data } = await axios.get(`/api/tasks/${taskId}/comments`);
    return data.comments ?? [];
  }

  static async create(taskId: string, body: string, mentionIds: string[] = []) {
    const { data } = await axios.post(`/api/tasks/${taskId}/comments`, {
      body,
      mentionIds,
    });
    return data.comment;
  }

  static async update(taskId: string, commentId: string, body: string) {
    const { data } = await axios.patch(
      `/api/tasks/${taskId}/comments/${commentId}`,
      { body },
    );
    return data.comment;
  }

  static async delete(taskId: string, commentId: string) {
    const { data } = await axios.delete(
      `/api/tasks/${taskId}/comments/${commentId}`,
    );
    return data;
  }
}

export abstract class SubtaskQueries {
  static keys = {
    byTask: (taskId: string) => ["subtasks", taskId] as const,
  };

  static async fetchByTask(taskId: string) {
    const { data } = await axios.get(`/api/tasks/${taskId}/subtasks`);
    return data.subtasks ?? [];
  }

  static async create(taskId: string, title: string) {
    const { data } = await axios.post(`/api/tasks/${taskId}/subtasks`, {
      title,
    });
    return data.subtask;
  }

  static async update(
    taskId: string,
    subtaskId: string,
    payload: { title?: string; isDone?: boolean; deadline?: string | null },
  ) {
    const { data } = await axios.patch(
      `/api/tasks/${taskId}/subtasks/${subtaskId}`,
      payload,
    );
    return data.subtask;
  }

  static async delete(taskId: string, subtaskId: string) {
    const { data } = await axios.delete(
      `/api/tasks/${taskId}/subtasks/${subtaskId}`,
    );
    return data;
  }
}

export abstract class TaskDependencyQueries {
  static keys = {
    byTask: (taskId: string) => ["dependencies", taskId] as const,
  };

  static async fetch(taskId: string) {
    const { data } = await axios.get(`/api/tasks/${taskId}/dependencies`);
    return data;
  }

  static async create(taskId: string, dependsOnTaskId: string) {
    const { data } = await axios.post(`/api/tasks/${taskId}/dependencies`, {
      dependsOnTaskId,
    });
    return data.dependency;
  }

  static async delete(taskId: string, dependencyId: string) {
    const { data } = await axios.delete(
      `/api/tasks/${taskId}/dependencies?dependencyId=${dependencyId}`,
    );
    return data;
  }
}

export abstract class TagQueries {
  static keys = {
    all: () => ["tags"] as const,
  };

  static async fetchAll(): Promise<Tag[]> {
    const { data } = await axios.get("/api/tags");
    return data.tags ?? [];
  }

  static async create(name: string, color: string): Promise<Tag> {
    const { data } = await axios.post("/api/tags", { name, color });
    return data.tag;
  }

  static async update(id: string, name: string, color: string): Promise<Tag> {
    const { data } = await axios.patch(`/api/tags?id=${id}`, { name, color });
    return data.tag;
  }

  static async delete(id: string): Promise<void> {
    await axios.delete(`/api/tags?id=${id}`);
  }
}

export abstract class MemberQueries {
  static keys = {
    all: () => ["members"] as const,
    team: () => ["members", "team"] as const,
    clients: () => ["members", "clients"] as const,
  };

  static async fetchAll(): Promise<Member[]> {
    const { data } = await axios.get("/api/members");
    return data.users ?? [];
  }

  static async fetchTeam(): Promise<Member[]> {
    const { data } = await axios.get("/api/members");
    const users: Member[] = data.users ?? [];
    return users.filter((u) => u.role !== "CLIENT");
  }

  static async fetchClients(): Promise<Member[]> {
    const { data } = await axios.get("/api/members");
    const users: Member[] = data.users ?? [];
    return users.filter((u) => u.role === "CLIENT");
  }
}

export abstract class AttachmentQueries {
  static keys = {
    byTask: (taskId: string) => ["attachments", taskId] as const,
  };

  static async fetchByTask(taskId: string) {
    const { data } = await axios.get(`/api/tasks/${taskId}/attachments`);
    return data.attachments ?? [];
  }

  static async create(
    taskId: string,
    attachment: {
      name: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    },
  ): Promise<TaskAttachment> {
    const { data } = await axios.post(
      `/api/tasks/${taskId}/attachments`,
      attachment,
    );
    return data.attachment;
  }

  static async delete(taskId: string, attachmentId: string): Promise<void> {
    await axios.delete(
      `/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`,
    );
  }
}

export abstract class TimeLogQueries {
  static keys = {
    byTask: (taskId: string) => ["timelogs", taskId] as const,
    active: () => ["timelogs", "active"] as const,
  };

  static async fetchByTask(taskId: string) {
    const { data } = await axios.get(`/api/tasks/${taskId}/timelogs`);
    return data.timeLogs ?? [];
  }

  static async fetchActiveTimers() {
    const { data } = await axios.get("/api/timelogs/active");
    return data.timers ?? [];
  }

  static async createManual(
    taskId: string,
    payload: {
      duration: number;
      type: string;
      note?: string;
      startedAt?: string;
    },
  ) {
    const { data } = await axios.post(`/api/tasks/${taskId}/timelogs`, payload);
    return data.timeLog;
  }

  static async startTimer(
    taskId: string,
    payload: { type: string; note?: string },
  ) {
    const { data } = await axios.post(`/api/tasks/${taskId}/timelogs`, payload);
    return data.timeLog;
  }

  static async stopTimer(taskId: string, timeLogId: string) {
    const { data } = await axios.patch(`/api/tasks/${taskId}/timelogs`, {
      timeLogId,
    });
    return data.timeLog;
  }

  static async update(
    taskId: string,
    timeLogId: string,
    payload: { duration?: number; note?: string; type?: string },
  ) {
    const { data } = await axios.patch(
      `/api/tasks/${taskId}/timelogs/${timeLogId}`,
      payload,
    );
    return data.timeLog;
  }

  static async delete(taskId: string, timeLogId: string) {
    const { data } = await axios.delete(
      `/api/tasks/${taskId}/timelogs/${timeLogId}`,
    );
    return data;
  }
}

export abstract class ActivityLogQueries {
  static keys = {
    byProject: (projectSlug: string) => ["activity", projectSlug] as const,
    byTask: (taskId: string) => ["activity", "task", taskId] as const,
  };

  static async fetchByProject(projectSlug: string, cursor?: string) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const { data } = await axios.get(
      `/api/projects/${projectSlug}/activity${query ? `?${query}` : ""}`,
    );
    return data;
  }

  static async fetchByTask(projectSlug: string, taskId: string) {
    const { data } = await axios.get(
      `/api/projects/${projectSlug}/activity?taskId=${taskId}`,
    );
    return data;
  }
}

export abstract class HistoryQueries {
  static keys = {
    byTask: (taskId: string) => ["history", taskId] as const,
  };

  static async fetchByTask(taskId: string) {
    const { data } = await axios.get(`/api/tasks/${taskId}/history`);
    return data.history ?? [];
  }
}

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

type CreateChannelPayload = {
  name: string;
  description?: string;
  type: ChannelType;
  projectId?: string;
};

type SendMessagePayload = {
  content: string;
  mediaUrls?: string[];
  mentions?: string[];
  replyToId?: string;
};

export abstract class ChannelQueries {
  static keys = {
    all: () => ["channels"] as const,
    byProject: (projectId: string) => ["channels", projectId] as const,
    detail: (channelId: string) => ["channel", channelId] as const,
    members: (channelId: string) => ["channel", channelId, "members"] as const,
  };

  static async fetchAll(projectId?: string): Promise<Channel[]> {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    const query = params.toString();
    const { data } = await axios.get(
      `/api/channels${query ? `?${query}` : ""}`,
    );
    return data.channels ?? [];
  }

  static async fetchById(channelId: string): Promise<Channel> {
    const { data } = await axios.get(`/api/channels/${channelId}`);
    return data.channel;
  }

  static async fetchMembers(channelId: string): Promise<Member[]> {
    const { data } = await axios.get(`/api/channels/${channelId}/members`);
    return data.members ?? [];
  }

  static async create(payload: CreateChannelPayload): Promise<Channel> {
    const { data } = await axios.post("/api/channels", payload);
    return data.channel;
  }

  static async update(
    channelId: string,
    payload: Partial<CreateChannelPayload>,
  ): Promise<Channel> {
    const { data } = await axios.patch(`/api/channels/${channelId}`, payload);
    return data.channel;
  }

  static async delete(channelId: string) {
    const { data } = await axios.delete(`/api/channels/${channelId}`);
    return data;
  }

  static async markRead(channelId: string) {
    const { data } = await axios.patch(`/api/channels/${channelId}/read`);
    return data;
  }
}

export abstract class MessageQueries {
  static keys = {
    byChannel: (channelId: string) => ["messages", channelId] as const,
    byChannelPaginated: (channelId: string, before?: string, after?: string) =>
      ["messages", channelId, before, after] as const,
  };

  static async fetchByChannel(
    channelId: string,
    options?: { before?: string; after?: string; limit?: number },
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options?.before) params.set("before", options.before);
    if (options?.after) params.set("after", options.after);
    if (options?.limit) params.set("limit", options.limit.toString());

    const query = params.toString();
    const { data } = await axios.get(
      `/api/channels/${channelId}/messages${query ? `?${query}` : ""}`,
    );
    return {
      messages: data.messages ?? [],
      hasMore: data.hasMore ?? false,
    };
  }

  static async send(
    channelId: string,
    payload: SendMessagePayload,
  ): Promise<Message> {
    const { data } = await axios.post(
      `/api/channels/${channelId}/messages`,
      payload,
    );
    return data.message;
  }

  static async update(
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<Message> {
    const { data } = await axios.patch(
      `/api/channels/${channelId}/messages/${messageId}`,
      { content },
    );
    return data.message;
  }

  static async delete(channelId: string, messageId: string) {
    const { data } = await axios.delete(
      `/api/channels/${channelId}/messages/${messageId}`,
    );
    return data;
  }
}
