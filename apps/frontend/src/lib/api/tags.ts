import { http } from "./http";

export class TagsApi {
  async list() {
    const { data } = await http.get("/api/tags");
    return data;
  }

  async create(name: string, color: string) {
    const { data } = await http.post("/api/tags", { name, color });
    return data;
  }

  async update(id: string, name?: string, color?: string) {
    const { data } = await http.patch(`/api/tags?id=${id}`, { name, color });
    return data;
  }

  async remove(id: string) {
    const { data } = await http.delete(`/api/tags?id=${id}`);
    return data;
  }
}

export const tagsApi = new TagsApi();
