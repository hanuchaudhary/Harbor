import type { InviteType, VerifyInviteType } from "@repo/validators";

import { http } from "./http";

export class InviteApi {
  async list(params: {
    page: number;
    search?: string;
    role?: string;
    used?: string;
  }) {
    const search = new URLSearchParams({
      page: String(params.page),
      limit: "10",
      ...(params.search && { search: params.search }),
      ...(params.role && { role: params.role }),
      ...(params.used && { used: params.used }),
    });
    const { data } = await http.get(`/api/invite?${search}`);
    return data;
  }

  async create(payload: InviteType) {
    const { data } = await http.post("/api/invite", payload);
    return data;
  }

  async accept(payload: VerifyInviteType) {
    const { data } = await http.post("/api/invite/accept", payload);
    return data;
  }
}

export const inviteApi = new InviteApi();
