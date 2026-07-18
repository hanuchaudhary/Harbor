import { http } from "./http";

export class NotificationsApi {
  async list(params?: { unreadOnly?: boolean }) {
    const search = new URLSearchParams();
    if (params?.unreadOnly) search.set("unreadOnly", "true");
    const q = search.toString();
    const { data } = await http.get(`/api/notifications${q ? `?${q}` : ""}`);
    return data;
  }

  async markAllRead() {
    const { data } = await http.patch("/api/notifications");
    return data;
  }

  async clearAll() {
    const { data } = await http.delete("/api/notifications");
    return data;
  }

  async markRead(id: string) {
    const { data } = await http.patch(`/api/notifications/${id}`);
    return data;
  }

  async remove(id: string) {
    const { data } = await http.delete(`/api/notifications/${id}`);
    return data;
  }
}

export const notificationsApi = new NotificationsApi();
