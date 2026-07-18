import { Elysia } from "elysia";
import { prisma } from "@repo/db";

import { getGithubRepos } from "../../lib/actions/github";
import { auth } from "../../lib/auth";

export const githubRoutes = new Elysia({
  prefix: "/api/github",
  tags: ["GitHub"],
}).get(
  "/repos",
  async ({ request, set }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      const user = session?.user;
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const userAccounts = await prisma.account.findMany({
        where: { userId: user.id, providerId: "github" },
      });

      if (userAccounts.length === 0) {
        return { linked: false };
      }

      const { searchParams } = new URL(request.url);
      const orgsParam = searchParams.get("orgs");
      const orgs = orgsParam
        ? orgsParam
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : ["OceanLab-Technology"];

      const repos = await getGithubRepos(userAccounts[0]?.accessToken!, orgs);

      if (!repos) {
        set.status = 400;
        return { error: "Failed to fetch GitHub repos" };
      }

      return { linked: true, repos };
    } catch (error) {
      set.status = 500;
      return { error: "Failed to fetch GitHub repos" };
    }
  },
);
