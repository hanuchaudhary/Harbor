import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, image } = body;

    if (name !== undefined && typeof name === "string" && !name.trim()) {
      return NextResponse.json(
        { message: "Name cannot be empty" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(image !== undefined && { image: image || null }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      });
      const parserChanges = {
        ...(name !== undefined &&
          existing.name !== updated.name && {
            name: { from: existing.name, to: updated.name },
          }),
        ...(image !== undefined &&
          existing.image !== updated.image && {
            image: { from: existing.image, to: updated.image },
          }),
      };
      await logActivity(tx, {
        userId: session.user.id,
        action: "USER_UPDATED",
        metadata: {
          description: ActivityParser.profile.updated(parserChanges),
          entity: { type: "user", id: updated.id, name: updated.name },
          changes: [
            ...(parserChanges.name
              ? [
                  {
                    field: "name",
                    from: parserChanges.name.from,
                    to: parserChanges.name.to,
                  },
                ]
              : []),
            ...(parserChanges.image
              ? [
                  {
                    field: "profileImage",
                    from: Boolean(parserChanges.image.from),
                    to: Boolean(parserChanges.image.to),
                  },
                ]
              : []),
          ],
        },
      });
      return updated;
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500 },
    );
  }
}
