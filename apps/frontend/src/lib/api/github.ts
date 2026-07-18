import { http } from "./http";

export class GithubApi {
  async repos() {
    const { data } = await http.get("/api/github/repos");
    return data;
  }
}

export const githubApi = new GithubApi();
