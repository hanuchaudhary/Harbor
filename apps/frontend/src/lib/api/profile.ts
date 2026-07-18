import { http } from "./http";

export class ProfileApi {
  async get() {
    const { data } = await http.get("/api/profile");
    return data;
  }

  async update(payload: {
    name?: string;
    bio?: string;
    image?: string;
  }) {
    const { data } = await http.patch("/api/profile", payload);
    return data;
  }
}

export const profileApi = new ProfileApi();
