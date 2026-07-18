import { http } from "./http";

export class ActiveApi {
  async ping(payload?: { status?: string; taskId?: string | null }) {
    const { data } = await http.post("/api/active", payload ?? {});
    return data;
  }

  async list() {
    const { data } = await http.get("/api/active");
    return data;
  }
}

export const activeApi = new ActiveApi();
