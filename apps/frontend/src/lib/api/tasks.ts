import { http } from "./http";

export type TaskCreatePayload = {
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
  repoId?: string;
};

export type TaskUpdatePayload = Partial<Omit<TaskCreatePayload, "projectId">> & {
  order?: number;
  progressPct?: number;
};

export class TasksApi {
  async list(params?: {
    projectId?: string;
    status?: string;
    priority?: string;
    limitPerStatus?: number;
    cursor?: string;
    cursorStatus?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.projectId) search.set("projectId", params.projectId);
    if (params?.status) search.set("status", params.status);
    if (params?.priority) search.set("priority", params.priority);
    if (params?.limitPerStatus)
      search.set("limitPerStatus", String(params.limitPerStatus));
    if (params?.cursor) search.set("cursor", params.cursor);
    if (params?.cursorStatus) search.set("cursorStatus", params.cursorStatus);
    const q = search.toString();
    const { data } = await http.get(`/api/tasks${q ? `?${q}` : ""}`);
    return data;
  }

  async get(taskId: string) {
    const { data } = await http.get(`/api/tasks/${taskId}`);
    return data;
  }

  async create(payload: TaskCreatePayload) {
    const { data } = await http.post("/api/tasks", payload);
    return data;
  }

  async update(taskId: string, payload: TaskUpdatePayload) {
    const { data } = await http.patch(`/api/tasks/${taskId}`, payload);
    return data;
  }

  async remove(taskId: string) {
    const { data } = await http.delete(`/api/tasks/${taskId}`);
    return data;
  }

  async reorder(updates: { id: string; order: number; status?: string }[]) {
    const { data } = await http.patch("/api/tasks/reorder", { updates });
    return data;
  }

  async updateAssignees(taskId: string, assigneeIds: string[]) {
    const { data } = await http.patch(`/api/tasks/${taskId}/assignees`, {
      assigneeIds,
    });
    return data;
  }

  async updateTags(taskId: string, tagIds: string[]) {
    const { data } = await http.patch(`/api/tasks/${taskId}/tags`, { tagIds });
    return data;
  }

  async listComments(taskId: string) {
    const { data } = await http.get(`/api/tasks/${taskId}/comments`);
    return data;
  }

  async createComment(taskId: string, body: string, mentionIds: string[] = []) {
    const { data } = await http.post(`/api/tasks/${taskId}/comments`, {
      body,
      mentionIds,
    });
    return data;
  }

  async updateComment(taskId: string, commentId: string, body: string) {
    const { data } = await http.patch(
      `/api/tasks/${taskId}/comments/${commentId}`,
      { body },
    );
    return data;
  }

  async deleteComment(taskId: string, commentId: string) {
    const { data } = await http.delete(
      `/api/tasks/${taskId}/comments/${commentId}`,
    );
    return data;
  }

  async listSubtasks(taskId: string) {
    const { data } = await http.get(`/api/tasks/${taskId}/subtasks`);
    return data;
  }

  async createSubtask(taskId: string, title: string) {
    const { data } = await http.post(`/api/tasks/${taskId}/subtasks`, { title });
    return data;
  }

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    payload: { title?: string; isDone?: boolean; deadline?: string | null },
  ) {
    const { data } = await http.patch(
      `/api/tasks/${taskId}/subtasks/${subtaskId}`,
      payload,
    );
    return data;
  }

  async deleteSubtask(taskId: string, subtaskId: string) {
    const { data } = await http.delete(
      `/api/tasks/${taskId}/subtasks/${subtaskId}`,
    );
    return data;
  }

  async listDependencies(taskId: string) {
    const { data } = await http.get(`/api/tasks/${taskId}/dependencies`);
    return data;
  }

  async createDependency(taskId: string, dependsOnTaskId: string) {
    const { data } = await http.post(`/api/tasks/${taskId}/dependencies`, {
      dependsOnTaskId,
    });
    return data;
  }

  async deleteDependency(taskId: string, dependencyId: string) {
    const { data } = await http.delete(
      `/api/tasks/${taskId}/dependencies?dependencyId=${dependencyId}`,
    );
    return data;
  }

  async listAttachments(taskId: string) {
    const { data } = await http.get(`/api/tasks/${taskId}/attachments`);
    return data;
  }

  async createAttachment(
    taskId: string,
    attachment: {
      name: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    },
  ) {
    const { data } = await http.post(
      `/api/tasks/${taskId}/attachments`,
      attachment,
    );
    return data;
  }

  async deleteAttachment(taskId: string, attachmentId: string) {
    const { data } = await http.delete(
      `/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`,
    );
    return data;
  }

  async history(taskId: string) {
    const { data } = await http.get(`/api/tasks/${taskId}/history`);
    return data;
  }

  async listTimelogs(taskId: string) {
    const { data } = await http.get(`/api/tasks/${taskId}/timelogs`);
    return data;
  }

  async createTimelog(taskId: string, payload: Record<string, unknown>) {
    const { data } = await http.post(`/api/tasks/${taskId}/timelogs`, payload);
    return data;
  }

  async stopTimelog(taskId: string, timeLogId: string) {
    const { data } = await http.patch(`/api/tasks/${taskId}/timelogs`, {
      timeLogId,
    });
    return data;
  }

  async updateTimelog(
    taskId: string,
    timeLogId: string,
    payload: { duration?: number; note?: string; type?: string },
  ) {
    const { data } = await http.patch(
      `/api/tasks/${taskId}/timelogs/${timeLogId}`,
      payload,
    );
    return data;
  }

  async deleteTimelog(taskId: string, timeLogId: string) {
    const { data } = await http.delete(
      `/api/tasks/${taskId}/timelogs/${timeLogId}`,
    );
    return data;
  }
}

export const tasksApi = new TasksApi();
