import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/actions/activity";
import { ActivityParser } from "@/lib/activity/activity-parser";

interface Params {
  params: Promise<{ slug: string; milestoneId: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { milestoneId } = await params;
    const body = await request.json();
    const { title, description, status, startDate, endDate } = body;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId, deletedAt: null },
    });

    if (!milestone) {
      return NextResponse.json(
        { message: "Milestone not found" },
        { status: 404 },
      );
    }

    const result = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(title !== undefined && { title: String(title) }),
        ...(description !== undefined && {
          description: description ? String(description) : null,
        }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });

    const changes: {
      title?: { from: string; to: string };
      description?: { from: string | null; to: string | null };
      status?: { from: string; to: string };
      startDate?: { from: Date | null; to: Date | null };
      endDate?: { from: Date | null; to: Date | null };
    } = {};

    if (title !== undefined && title !== milestone.title) {
      changes.title = { from: milestone.title, to: String(title) };
    }
    if (description !== undefined && description !== milestone.description) {
      changes.description = {
        from: milestone.description,
        to: description ? String(description) : null,
      };
    }
    if (status !== undefined && status !== milestone.status) {
      changes.status = { from: milestone.status, to: status };
    }
    if (startDate !== undefined) {
      const newDate = startDate ? new Date(startDate) : null;
      if (
        (milestone.startDate === null && newDate !== null) ||
        (milestone.startDate !== null && newDate === null) ||
        (milestone.startDate &&
          newDate &&
          milestone.startDate.getTime() !== newDate.getTime())
      ) {
        changes.startDate = { from: milestone.startDate, to: newDate };
      }
    }
    if (endDate !== undefined) {
      const newDate = endDate ? new Date(endDate) : null;
      if (
        (milestone.endDate === null && newDate !== null) ||
        (milestone.endDate !== null && newDate === null) ||
        (milestone.endDate &&
          newDate &&
          milestone.endDate.getTime() !== newDate.getTime())
      ) {
        changes.endDate = { from: milestone.endDate, to: newDate };
      }
    }

    await logActivity(null as any, {
      userId: session.user.id,
      action:
        status && status !== milestone.status
          ? status === "COMPLETED"
            ? "MILESTONE_COMPLETED"
            : "MILESTONE_STATUS_CHANGED"
          : "MILESTONE_UPDATED",
      projectId: milestone.projectId,
      metadata: {
        description: ActivityParser.milestone.updated(result.title, changes),
      },
    });

    const updated = result;

    return NextResponse.json({ milestone: updated }, { status: 200 });
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

  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "PROJECT_MANAGER"
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { milestoneId } = await params;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { id: true, title: true, projectId: true },
    });

    if (!milestone) {
      return NextResponse.json(
        { message: "Milestone not found" },
        { status: 404 },
      );
    }

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { deletedAt: new Date() },
    });

    await logActivity(null as any, {
      userId: session.user.id,
      action: "MILESTONE_DELETED",
      projectId: milestone.projectId,
      metadata: {
        description: ActivityParser.milestone.deleted(milestone.title),
      },
    });

    return NextResponse.json({ message: "Milestone deleted" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
