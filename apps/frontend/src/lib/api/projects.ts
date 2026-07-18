import type { ProjectType } from "@repo/validators";

import { http } from "./http";

export class ProjectsApi {
  async list(params?: { limit?: number; page?: number; search?: string; status?: string }) {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.page) search.set("page", String(params.page));
    if (params?.search) search.set("search", params.search);
    if (params?.status) search.set("status", params.status);
    const q = search.toString();
    const { data } = await http.get(`/api/projects${q ? `?${q}` : ""}`);
    return data;
  }

  async get(slug: string) {
    const { data } = await http.get(`/api/projects/${slug}`);
    return data;
  }

  async create(payload: ProjectType | Record<string, unknown>) {
    const { data } = await http.post("/api/projects", payload);
    return data;
  }

  async update(slug: string, payload: Partial<ProjectType> | Record<string, unknown>) {
    const { data } = await http.patch(`/api/projects/${slug}`, payload);
    return data;
  }

  async remove(slug: string) {
    const { data } = await http.delete(`/api/projects/${slug}`);
    return data;
  }

  async addMember(
    slug: string,
    userIds: string[],
    type: "member" | "client" = "member",
  ) {
    const { data } = await http.post(`/api/projects/${slug}/members`, {
      userIds,
      type,
    });
    return data;
  }

  async removeMember(
    slug: string,
    userId: string,
    type: "member" | "client" = "member",
  ) {
    const { data } = await http.delete(
      `/api/projects/${slug}/members?userId=${userId}&type=${type}`,
    );
    return data;
  }

  async activity(slug: string, params?: { cursor?: string; taskId?: string; page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.cursor) search.set("cursor", params.cursor);
    if (params?.taskId) search.set("taskId", params.taskId);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const q = search.toString();
    const { data } = await http.get(
      `/api/projects/${slug}/activity${q ? `?${q}` : ""}`,
    );
    return data;
  }

  async analytics(slug: string) {
    const { data } = await http.get(`/api/projects/${slug}/analytics`);
    return data;
  }

  async addDocs(slug: string, payload: unknown) {
    const { data } = await http.post(`/api/projects/${slug}/docs`, payload);
    return data;
  }

  async updateDocs(slug: string, payload: unknown) {
    const { data } = await http.patch(`/api/projects/${slug}/docs`, payload);
    return data;
  }

  async deleteDocs(slug: string, payload: unknown) {
    const { data } = await http.delete(`/api/projects/${slug}/docs`, {
      data: payload,
    });
    return data;
  }

  async addAssets(slug: string, payload: unknown) {
    const { data } = await http.post(`/api/projects/${slug}/assets`, payload);
    return data;
  }

  async updateAssets(slug: string, payload: unknown) {
    const { data } = await http.patch(`/api/projects/${slug}/assets`, payload);
    return data;
  }

  async deleteAssets(slug: string, payload: unknown) {
    const { data } = await http.delete(`/api/projects/${slug}/assets`, {
      data: payload,
    });
    return data;
  }
}

export const projectsApi = new ProjectsApi();
