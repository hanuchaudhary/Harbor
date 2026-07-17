import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, fileUrl, fileType, fileSize, tags } = body;

    if (!name || !fileUrl || !fileType || !fileSize) {
      return NextResponse.json(
        { message: "Name, fileUrl, fileType, and fileSize are required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.asset.create({
        data: {
          projectId: project.id,
          name,
          fileUrl,
          fileType,
          fileSize: Number(fileSize),
          tags: Array.isArray(tags) ? tags : [],
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "PROJECT_UPDATED",
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.assetsUpdated("added", 1),
        },
      });

      return created;
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();
    const { assetId, name, fileUrl, fileType, fileSize, tags } = body;

    if (!assetId) {
      return NextResponse.json(
        { message: "Asset ID is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const existingAsset = await prisma.asset.findFirst({
      where: { id: assetId, projectId: project.id },
    });

    if (!existingAsset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    const asset = await prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id: assetId },
        data: {
          ...(name !== undefined && { name }),
          ...(fileUrl !== undefined && { fileUrl }),
          ...(fileType !== undefined && { fileType }),
          ...(fileSize !== undefined && { fileSize: Number(fileSize) }),
          ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "PROJECT_UPDATED",
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.assetsUpdated("updated", 1),
        },
      });

      return updated;
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");

    if (!assetId) {
      return NextResponse.json(
        { message: "Asset ID is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    await prisma.asset.delete({
      where: { id: assetId, projectId: project.id },
    });

    await logActivity(null as any, {
      userId: session.user.id,
      action: "PROJECT_UPDATED",
      projectId: project.id,
      metadata: {
        description: ActivityParser.project.assetsUpdated("removed", 1),
      },
    });

    return NextResponse.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
