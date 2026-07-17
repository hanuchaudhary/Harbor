import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { toSlug } from "@/lib/utils";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";

interface Params {
  params: Promise<{ slug: string }>;
}

const toDocContent = (content: Prisma.JsonValue | null): string => {
  if (typeof content === "string") {
    return content;
  }

  if (
    content &&
    typeof content === "object" &&
    !Array.isArray(content) &&
    "text" in content
  ) {
    const text = (content as { text?: unknown }).text;
    return typeof text === "string" ? text : "";
  }
  return "";
};

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";

  try {
    const { slug } = await params;
    const project = await prisma.project.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        budget: isAdmin,
        progressPct: true,
        currency: isAdmin,
        budgetUsd: isAdmin,
        startDate: true,
        estimatedEndAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        repos: {
          select: {
            id: true,
            name: true,
            url: true,
          },
          orderBy: { createdAt: "asc" },
        },
        docs: {
          select: {
            id: true,
            title: true,
            content: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        assets: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            folder: true,
            tags: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        members: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        clients: isAdmin && {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
            docs: true,
            assets: true,
          },
        },
        milestones: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        project: {
          ...project,
          docs: project.docs.map((doc) => ({
            ...doc,
            content: toDocContent(doc.content),
          })),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();
    const {
      name,
      slug: inputSlug,
      description,
      status,
      budget,
      progressPct,
      currency,
      startDate,
      estimatedEndAt,
      completedAt,
      repos,
    } = body;

    const project = await prisma.project.findUnique({
      where: { slug },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const changes: Record<string, any> = {};

    if (name && name !== project.name)
      changes.name = { from: project.name, to: name };

    if(progressPct !== undefined && progressPct !== project.progressPct) {
      changes.progressPct = { from: project.progressPct, to: progressPct };
    }

    if (inputSlug !== undefined && toSlug(inputSlug) !== project.slug) {
      changes.slug = { from: project.slug, to: toSlug(inputSlug) };
    }
    if (description !== undefined && description !== project.description) {
      changes.description = { from: project.description, to: description };
    }
    if (status && status !== project.status) {
      changes.status = { from: project.status, to: status };
    }
    if (budget !== undefined) {
      const newBudget = budget ? parseFloat(budget) : null;
      if (newBudget !== project.budget) {
        changes.budget = { from: project.budget, to: newBudget };
      }
    }
    if (currency && currency !== project.currency) {
      changes.currency = { from: project.currency, to: currency };
    }
    if (startDate !== undefined) {
      const newStartDate = startDate ? new Date(startDate) : null;
      if (newStartDate?.getTime() !== project.startDate?.getTime()) {
        changes.startDate = { from: project.startDate, to: newStartDate };
      }
    }
    if (estimatedEndAt !== undefined) {
      const newEstimatedEndAt = estimatedEndAt
        ? new Date(estimatedEndAt)
        : null;
      if (newEstimatedEndAt?.getTime() !== project.estimatedEndAt?.getTime()) {
        changes.estimatedEndAt = {
          from: project.estimatedEndAt,
          to: newEstimatedEndAt,
        };
      }
    }
    if (completedAt !== undefined) {
      const newCompletedAt = completedAt ? new Date(completedAt) : null;
      if (newCompletedAt?.getTime() !== project.completedAt?.getTime()) {
        changes.completedAt = { from: project.completedAt, to: newCompletedAt };
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (repos !== undefined) {
        await tx.projectRepo.deleteMany({
          where: { projectId: project.id },
        });

        if (Array.isArray(repos) && repos.length > 0) {
          const reposToCreate = repos
            .filter((repo) => repo?.name && repo?.url)
            .map((repo) => ({
              name: String(repo.name),
              url: String(repo.url),
              projectId: project.id,
            }));

          if (reposToCreate.length > 0) {
            await tx.projectRepo.createMany({
              data: reposToCreate,
            });
          }
        }
      }

      return await tx.project.update({
        where: { slug },
        data: {
          ...(name && { name }),
          ...(inputSlug !== undefined && { slug: toSlug(inputSlug) }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
          ...(progressPct !== undefined && { progressPct }),
          ...(budget !== undefined && {
            budget: budget ? parseFloat(budget) : null,
          }),
          ...(currency && { currency }),
          ...(startDate !== undefined && {
            startDate: startDate ? new Date(startDate) : null,
          }),
          ...(estimatedEndAt !== undefined && {
            estimatedEndAt: estimatedEndAt ? new Date(estimatedEndAt) : null,
          }),
          ...(completedAt !== undefined && {
            completedAt: completedAt ? new Date(completedAt) : null,
          }),
        },
      });
    });

    if (Object.keys(changes).length > 0) {
      const action = changes.status
        ? "PROJECT_STATUS_CHANGED"
        : changes.budget
          ? "PROJECT_BUDGET_UPDATED"
          : changes.startDate || changes.estimatedEndAt || changes.progressPct
            ? "PROJECT_DATES_UPDATED"
            : "PROJECT_UPDATED";

      await logActivity(null as any, {
        userId: session.user.id,
        action,
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.updated(changes),
        },
      });
    }

    const updatedProject = updated;

    return NextResponse.json(
      {
        message: "Project updated successfully",
        project: updatedProject,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { slug } = await params;

    const project = await prisma.project.findUnique({
      where: { slug },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { slug },
        data: {
          deletedAt: new Date(),
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "PROJECT_DELETED",
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.deleted(project.name),
        },
      });
    });

    return NextResponse.json(
      { message: "Project deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
