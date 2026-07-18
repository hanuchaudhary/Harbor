import { getGithubRepos } from "@/lib/actions/github";
import { auth } from "@/lib/auth/auth";
import prisma from "@repo/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userAccounts = await prisma.account.findMany({
      where: {
        userId: user.id,
        providerId: "github",
      },
    });

    if (userAccounts.length === 0) {
      return NextResponse.json({ linked: false });
    }

    const { searchParams } = new URL(req.url);
    const orgsParam = searchParams.get("orgs");
    const orgs = orgsParam
      ? orgsParam
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : ["OceanLab-Technology"];

    const repos = await getGithubRepos(userAccounts[0].accessToken!, orgs);
    // console.log(repos);

    if (!repos) {
      return NextResponse.json(
        { error: "Failed to fetch GitHub repos" },
        { status: 400 },
      );
    }

    return NextResponse.json({ linked: true, repos });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch GitHub repos" },
      { status: 500 },
    );
  }
}
