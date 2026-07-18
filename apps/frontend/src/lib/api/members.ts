import { http } from "./http";

export class MembersApi {
  async list() {
    const { data } = await http.get("/api/members");
    return data;
  }
}

export const membersApi = new MembersApi();
