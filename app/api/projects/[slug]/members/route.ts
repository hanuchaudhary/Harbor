import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { z } from "zod";

const addMemberSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  type: z.enum(["member", "client"]).default("member"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();
    const { userIds, type } = addMemberSchema.parse(body);

    const project = await prisma.project.findUnique({
      where: { slug },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (
      !currentUser ||
      !["ADMIN", "PROJECT_MANAGER"].includes(currentUser.role)
    ) {
      return NextResponse.json(
        { error: "Only admins and project managers can add members" },
        { status: 403 },
      );
    }

    const addedUsers: string[] = [];
    const skippedUsers: string[] = [];

    for (const userId of userIds) {
      if (type === "client") {
        const existingClient = await prisma.projectClient.findUnique({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId,
            },
          },
        });

        if (existingClient) {
          skippedUsers.push(userId);
          continue;
        }

        await prisma.projectClient.create({
          data: {
            projectId: project.id,
            userId,
          },
        });

        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            projectId: project.id,
            action: "PROJECT_CLIENT_ADDED",
            metadata: { clientId: userId },
          },
        });

        addedUsers.push(userId);
      } else {
        const existingMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId,
            },
          },
        });

        if (existingMember) {
          skippedUsers.push(userId);
          continue;
        }

        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId,
          },
        });

        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            projectId: project.id,
            action: "PROJECT_MEMBER_ADDED",
            metadata: { memberId: userId },
          },
        });

        addedUsers.push(userId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${addedUsers.length} ${type === "client" ? "client(s)" : "member(s)"} added successfully`,
      addedCount: addedUsers.length,
      skippedCount: skippedUsers.length,
    });
  } catch (error) {
    console.error("Error adding member:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "member";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { slug },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (
      !currentUser ||
      !["ADMIN", "PROJECT_MANAGER"].includes(currentUser.role)
    ) {
      return NextResponse.json(
        { error: "Only admins and project managers can remove members" },
        { status: 403 },
      );
    }

    if (type === "client") {
      await prisma.projectClient.delete({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId,
          },
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          projectId: project.id,
          action: "PROJECT_CLIENT_REMOVED",
          metadata: { clientId: userId },
        },
      });
    } else {
      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId,
          },
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          projectId: project.id,
          action: "PROJECT_MEMBER_REMOVED",
          metadata: { memberId: userId },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${type === "client" ? "Client" : "Member"} removed successfully`,
    });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
