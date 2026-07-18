import { Prisma } from "@repo/db/client";
import { toSlug } from "../../../lib/utils";

import { prisma } from "@repo/db";
import { logActivity } from "../../../lib/actions/activity";
import { ActivityParser } from "../../../lib/activity/activity-parser";
import {
  isOrgAdmin,
  requireActiveMembership,
} from "../../../lib/org";


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

export async function GET(request: Request, params: Record<string, string>) {
  const membership = await requireActiveMembership(request.headers);

  if ("error" in membership) {
    return Response.json({ message: membership.error.message },
      { status: membership.error.status },
    );
  }

  const isAdmin = isOrgAdmin(membership.memberRole);

  try {
    const { slug } = params;
    const project = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId: membership.organizationId,
          slug,
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        progressPct: true,
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
            docs: true,
            assets: true,
          },
        },
      },
    });

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    return Response.json(
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
    return Response.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, params: Record<string, string>) {
  const membership = await requireActiveMembership(request.headers);

  if ("error" in membership) {
    return Response.json(
      { message: membership.error.message },
      { status: membership.error.status },
    );
  }

  if (!isOrgAdmin(membership.memberRole)) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { session, organizationId } = membership;

  try {
    const { slug } = params;
    const body = await request.json();
    const {
      name,
      slug: inputSlug,
      description,
      status,
      progressPct,
      startDate,
      estimatedEndAt,
      completedAt,
      repos,
    } = body;

    const project = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });

    if (!project) {
      return Response.json({ message: "Project not found" },
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
        where: { id: project.id },
        data: {
          ...(name && { name }),
          ...(inputSlug !== undefined && { slug: toSlug(inputSlug) }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
          ...(progressPct !== undefined && { progressPct }),
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
        : changes.startDate || changes.estimatedEndAt || changes.progressPct
          ? "PROJECT_DATES_UPDATED"
          : "PROJECT_UPDATED";

      await logActivity(undefined, {
        userId: session.user.id,
        action,
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.updated(changes),
        },
      });
    }

    const updatedProject = updated;

    return Response.json(
      {
        message: "Project updated successfully",
        project: updatedProject,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, params: Record<string, string>) {
  const membership = await requireActiveMembership(request.headers);

  if ("error" in membership) {
    return Response.json(
      { message: membership.error.message },
      { status: membership.error.status },
    );
  }

  if (!isOrgAdmin(membership.memberRole)) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { session, organizationId } = membership;

  try {
    const { slug } = params;

    const project = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });

    if (!project) {
      return Response.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
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

    return Response.json(
      { message: "Project deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
