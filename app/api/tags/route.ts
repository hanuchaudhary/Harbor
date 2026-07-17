import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    });
    return NextResponse.json({ tags });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, color } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 },
      );
    }

    const tag = await prisma.$transaction(async (tx) => {
      const created = await tx.tag.create({
        data: { name: name.trim(), color: color || "#6366f1" },
        select: { id: true, name: true, color: true },
      });
      await logActivity(tx, {
        userId: session.user.id,
        action: "TAG_CREATED",
        metadata: {
          description: `Created tag '${created.name}'`,
          entity: { type: "tag", id: created.id, name: created.name },
        },
      });
      return created;
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Failed to create tag" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "Tag id is required" },
      { status: 400 },
    );
  }

  try {
    const { name, color } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 },
      );
    }

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }
    const tag = await prisma.$transaction(async (tx) => {
      const updated = await tx.tag.update({
        where: { id },
        data: { name: name.trim(), color },
        select: { id: true, name: true, color: true },
      });
      await logActivity(tx, {
        userId: session.user.id,
        action: "TAG_UPDATED",
        metadata: {
          description: `Updated tag '${updated.name}'`,
          entity: { type: "tag", id: updated.id, name: updated.name },
          changes: [
            ...(existing.name !== updated.name
              ? [{ field: "name", from: existing.name, to: updated.name }]
              : []),
            ...(existing.color !== updated.color
              ? [{ field: "color", from: existing.color, to: updated.color }]
              : []),
          ],
        },
      });
      return updated;
    });

    return NextResponse.json({ tag });
  } catch {
    return NextResponse.json(
      { message: "Failed to update tag" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "Tag id is required" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Tag not found" }, { status: 404 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.tag.delete({ where: { id } });
      await logActivity(tx, {
        userId: session.user.id,
        action: "TAG_DELETED",
        metadata: {
          description: `Deleted tag '${existing.name}'`,
          entity: { type: "tag", id, name: existing.name },
        },
      });
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete tag" },
      { status: 500 },
    );
  }
}
