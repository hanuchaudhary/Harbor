import { http } from "./http";

export class ClientPortalApi {
  async projects() {
    const { data } = await http.get("/api/client/projects");
    return data;
  }

  async project(slug: string) {
    const { data } = await http.get(`/api/client/projects/${slug}`);
    return data;
  }

  async tasks(slug: string) {
    const { data } = await http.get(`/api/client/projects/${slug}/tasks`);
    return data;
  }
}

export const clientPortalApi = new ClientPortalApi();
