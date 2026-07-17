import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import {
  Brand as BrandEnum,
  ProjectStatus as ProjectStatusEnum,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { toSlug } from "@/lib/utils";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";
import { createProjectChannels } from "@/lib/actions/channels";

const validProjectStatuses = Object.values(ProjectStatusEnum);
const validBrands = Object.values(BrandEnum);

const isProjectStatus = (
  value: string,
): value is (typeof validProjectStatuses)[number] =>
  validProjectStatuses.some((status) => status === value);

const isBrand = (value: string): value is (typeof validBrands)[number] =>
  validBrands.some((brand) => brand === value);

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const brand = searchParams.get("brand") || "";
    const parsedStatus = isProjectStatus(status) ? status : "";
    const parsedBrand = isBrand(brand) ? brand : "";
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
      ...(parsedStatus && { status: parsedStatus }),
      ...(parsedBrand && { brand: parsedBrand }),
      deletedAt: null,
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          brand: true,
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
    const body = await request.json();
    const {
      name,
      description,
      brand,
      status,
      budget,
      currency,
      startDate,
      estimatedEndAt,
      slug,
      repos,
      docs,
      milestones,
      assets,
    } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Project name is required" },
        { status: 400 },
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

    const milestonesToCreate = Array.isArray(milestones)
      ? milestones
          .filter((m) => m?.title)
          .map((m) => ({
            title: String(m.title),
            description: m.description ? String(m.description) : undefined,
            status: m.status ?? "NOT_STARTED",
            startDate: m.startDate ? new Date(m.startDate) : undefined,
            endDate: m.endDate ? new Date(m.endDate) : undefined,
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
          name,
          description,
          brand: brand || "OCEANLAB",
          status: status || "ACTIVE",
          slug: toSlug(slug || name),
          budget: parseFloat(budget),
          currency: currency || "USD",
          startDate: startDate ? new Date(startDate) : undefined,
          estimatedEndAt: estimatedEndAt ? new Date(estimatedEndAt) : undefined,
          ...(docsToCreate.length > 0 && {
            docs: {
              create: docsToCreate,
            },
          }),
          ...(milestonesToCreate.length > 0 && {
            milestones: {
              create: milestonesToCreate,
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
          brand: true,
          status: true,
          budget: true,
          currency: true,
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
