import { http } from "./http";

export class UsersApi {
  async list(params: { page: number; search?: string; role?: string }) {
    const search = new URLSearchParams({
      page: String(params.page),
      limit: "10",
      ...(params.search && { search: params.search }),
      ...(params.role && { role: params.role }),
    });
    const { data } = await http.get(`/api/users?${search}`);
    return data;
  }

  async update(
    userId: string,
    payload: {
      name?: string;
      role?: string;
      isActive?: boolean;
      isDesigner?: boolean;
    },
  ) {
    const { data } = await http.patch(`/api/users/${userId}`, payload);
    return data;
  }

  async remove(userId: string) {
    const { data } = await http.delete(`/api/users/${userId}`);
    return data;
  }
}

export const usersApi = new UsersApi();
