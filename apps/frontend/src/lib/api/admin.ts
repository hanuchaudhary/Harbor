import { http } from "./http";

export class AdminApi {
  async user(userId: string) {
    const { data } = await http.get(`/api/admin/users/${userId}`);
    return data;
  }

  async activity(params?: Record<string, string>) {
    const search = new URLSearchParams(params);
    const q = search.toString();
    const { data } = await http.get(`/api/admin/activity${q ? `?${q}` : ""}`);
    return data;
  }

  async analytics() {
    const { data } = await http.get("/api/admin/analytics");
    return data;
  }

  async validate(key: string) {
    const { data } = await http.post("/api/admin/validate", { key });
    return data;
  }
}

export const adminApi = new AdminApi();
