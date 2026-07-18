import { NextRequest, NextResponse } from "next/server";

import prisma from "@repo/db";
import { ProjectStatus as ProjectStatusEnum } from "@repo/db/enums";
import { Prisma } from "@repo/db/client";
import { toSlug } from "@/lib/utils";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";
import { createProjectChannels } from "@/lib/actions/channels";
import {
  isOrgAdmin,
  requireActiveMembership,
} from "@/lib/auth/org";

const validProjectStatuses = Object.values(ProjectStatusEnum);

const isProjectStatus = (
  value: string,
): value is (typeof validProjectStatuses)[number] =>
  validProjectStatuses.some((status) => status === value);

export async function GET(request: NextRequest) {
  const membership = await requireActiveMembership();

  if ("error" in membership) {
    return NextResponse.json(
      { message: membership.error.message },
      { status: membership.error.status },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const parsedStatus = isProjectStatus(status) ? status : "";
    const skip = (page - 1) * limit;

    const where = {
      organizationId: membership.organizationId,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
      ...(parsedStatus && { status: parsedStatus }),
      deletedAt: null,
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          slug: true,
          createdAt: true,
          repos: {
            select: {
              id: true,
              name: true,
              url: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          _count: {
            select: {
              members: true,
              tasks: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json(
      {
        projects,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
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

export async function POST(request: NextRequest) {
  const membership = await requireActiveMembership();

  if ("error" in membership) {
    return NextResponse.json(
      { message: membership.error.message },
      { status: membership.error.status },
    );
  }

  if (!isOrgAdmin(membership.memberRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { session, organizationId } = membership;

  try {
    const body = await request.json();
    const {
      name,
      description,
      status,
      startDate,
      estimatedEndAt,
      slug,
      repos,
      docs,
      assets,
    } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Project name is required" },
        { status: 400 },
      );
    }

    const projectSlug = toSlug(slug || name);
    const existing = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug: projectSlug,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { message: "A project with this slug already exists" },
        { status: 409 },
      );
    }

    const docsToCreate = Array.isArray(docs)
      ? docs
          .filter((doc) => doc?.title)
          .map((doc) => ({
            title: String(doc.title),
            content: doc.content ? String(doc.content) : Prisma.JsonNull,
          }))
      : [];

    const assetsToCreate = Array.isArray(assets)
      ? assets
          .filter(
            (asset) =>
              asset?.name &&
              asset?.fileUrl &&
              asset?.fileType &&
              asset?.fileSize,
          )
          .map((asset) => ({
            name: String(asset.name),
            fileUrl: String(asset.fileUrl),
            fileType: String(asset.fileType),
            fileSize: Number(asset.fileSize),
            tags: Array.isArray(asset.tags)
              ? asset.tags.map((tag: string) => String(tag))
              : [],
          }))
      : [];

    const reposToCreate = Array.isArray(repos)
      ? repos
          .filter((repo) => repo?.name && repo?.url)
          .map((repo) => ({
            name: String(repo.name),
            url: String(repo.url),
          }))
      : [];

    const project = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId,
          name,
          description,
          status: status || "ACTIVE",
          slug: projectSlug,
          startDate: startDate ? new Date(startDate) : undefined,
          estimatedEndAt: estimatedEndAt ? new Date(estimatedEndAt) : undefined,
          ...(docsToCreate.length > 0 && {
            docs: {
              create: docsToCreate,
            },
          }),
          ...(assetsToCreate.length > 0 && {
            assets: {
              create: assetsToCreate,
            },
          }),
          ...(reposToCreate.length > 0 && {
            repos: {
              create: reposToCreate,
            },
          }),
        },
        select: {
          id: true,
          slug: true,
          name: true,
          progressPct: true,
          description: true,
          status: true,
          startDate: true,
          estimatedEndAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "PROJECT_CREATED",
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.created(project.name),
        },
      });

      await createProjectChannels(tx,project.id, project.name);

      return project;
    });

    return NextResponse.json(
      { message: "Project created successfully", project },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
