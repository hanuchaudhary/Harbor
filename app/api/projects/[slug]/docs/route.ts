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
    const { title, content } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { message: "Title is required" },
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

    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.doc.create({
        data: {
          projectId: project.id,
          title,
          content: content || null,
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "PROJECT_UPDATED",
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.docsUpdated("added", 1),
        },
      });

      return created;
    });

    return NextResponse.json({ doc }, { status: 201 });
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
    const { docId, title, content } = body;

    if (!docId) {
      return NextResponse.json(
        { message: "Doc ID is required" },
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

    const existingDoc = await prisma.doc.findFirst({
      where: { id: docId, projectId: project.id },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 },
      );
    }

    const doc = await prisma.$transaction(async (tx) => {
      const updated = await tx.doc.update({
        where: { id: docId },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        },
      });

      await logActivity(tx, {
        userId: session.user.id,
        action: "PROJECT_UPDATED",
        projectId: project.id,
        metadata: {
          description: ActivityParser.project.docsUpdated("updated", 1),
        },
      });

      return updated;
    });

    return NextResponse.json({ doc });
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
    const docId = searchParams.get("docId");

    if (!docId) {
      return NextResponse.json(
        { message: "Doc ID is required" },
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

    await prisma.doc.delete({
      where: { id: docId, projectId: project.id },
    });

    await logActivity(null as any, {
      userId: session.user.id,
      action: "PROJECT_UPDATED",
      projectId: project.id,
      metadata: {
        description: ActivityParser.project.docsUpdated("removed", 1),
      },
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
