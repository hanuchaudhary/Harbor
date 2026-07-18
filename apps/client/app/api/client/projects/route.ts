import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "CLIENT") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const projects = await prisma.projectClient.findMany({
      where: { userId: session.user.id },
      select: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            startDate: true,
            estimatedEndAt: true,
            completedAt: true,
            createdAt: true,
            progressPct: true,
            _count: {
              select: {
                tasks: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedProjects = projects.map(({ project }) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      estimatedEndAt: project.estimatedEndAt,
      completedAt: project.completedAt,
      createdAt: project.createdAt,
      progressPct: project.progressPct,
      _count: {
        tasks: project._count.tasks,
      },
    }));

    return NextResponse.json({ projects: formattedProjects }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
