import { Octokit } from "@octokit/rest";

export function getGithubClient(token: string) {
  return new Octokit({
    auth: token,
  });
}

interface CreateGithubIssueParams {
  token: string;
  repo: string;
  owner: string;
  title: string;
  body: string;
  assignees?: string[];
  labels?: string[];
}

export async function createGithubIssue({
  token,
  repo,
  owner,
  title,
  body,
  assignees = [],
  labels = [],
}: CreateGithubIssueParams) {
  const octokit = getGithubClient(token);
  try {
    const { data } = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      assignees: assignees,
      labels,
    });
    return data;
  } catch (error) {
    console.error("Error creating GitHub issue:", error);
    throw new Error("Failed to create GitHub issue");
  }
}

export async function getGithubRepos(
  token: string,
  orgs: string[] = ["OceanLab-Technology", "WatermelonCorp"],
) {
  const octokit = getGithubClient(token);

  const allRepos: {
    id: number;
    name: string;
    owner: string;
    url: string;
    private: boolean;
    defaultBranch: string;
    createdAt: string | null;
  }[] = [];

  for (const org of orgs) {
    let page = 1;
    let fetched = 0;

    while (fetched < 200) {
      const { data } = await octokit.rest.repos.listForOrg({
        org,
        type: "all",
        direction: "desc",
        per_page: 100,
        page,
      });

      allRepos.push(
        ...data.map((repo) => ({
          id: repo.id,
          name: repo.name,
          owner: repo.owner.login,
          url: repo.html_url,
          private: repo.private,
          defaultBranch: repo.default_branch ?? "",
          createdAt: repo.created_at ?? null,
        })),
      );

      fetched += data.length;

      // No more pages available
      if (data.length < 100) break;

      page++;
    }
  }

  return allRepos;
}

export async function getGithubUsername(token: string) {
  const octokit = getGithubClient(token);
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}
