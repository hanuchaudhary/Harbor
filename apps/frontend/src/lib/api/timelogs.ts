import { http } from "./http";

export class TimelogsApi {
  async active() {
    const { data } = await http.get("/api/timelogs/active");
    return data;
  }

  async heartbeat(payload?: { timeLogId?: string }) {
    const { data } = await http.post("/api/timelogs/heartbeat", payload ?? {});
    return data;
  }
}

export const timelogsApi = new TimelogsApi();
