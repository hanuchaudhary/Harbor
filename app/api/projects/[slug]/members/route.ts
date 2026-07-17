import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { logActivity } from "@/lib/actions/activity";

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

    const project = await prisma.project.findFirst({
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
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    for (const userId of userIds) {
      const targetUser = usersById.get(userId);
      if (!targetUser) {
        skippedUsers.push(userId);
        continue;
      }
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

        await logActivity(undefined, {
          userId: session.user.id,
          projectId: project.id,
          action: "PROJECT_CLIENT_ADDED",
          metadata: {
            description: `Added client '${targetUser.name}' to project '${project.name}'`,
            entity: { type: "project", id: project.id, name: project.name },
            target: { type: "client", id: userId, name: targetUser.name },
            context: { projectId: project.id, projectName: project.name, projectSlug: slug },
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

        await logActivity(undefined, {
          userId: session.user.id,
          projectId: project.id,
          action: "PROJECT_MEMBER_ADDED",
          metadata: {
            description: `Added member '${targetUser.name}' to project '${project.name}'`,
            entity: { type: "project", id: project.id, name: project.name },
            target: { type: "member", id: userId, name: targetUser.name },
            context: { projectId: project.id, projectName: project.name, projectSlug: slug },
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

    const project = await prisma.project.findFirst({
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

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const targetName = targetUser?.name ?? "Unknown user";

    if (type === "client") {
      await prisma.projectClient.delete({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId,
          },
        },
      });

      await logActivity(undefined, {
        userId: session.user.id,
        projectId: project.id,
        action: "PROJECT_CLIENT_REMOVED",
        metadata: {
          description: `Removed client '${targetName}' from project '${project.name}'`,
          entity: { type: "project", id: project.id, name: project.name },
          target: { type: "client", id: userId, name: targetName },
          context: { projectId: project.id, projectName: project.name, projectSlug: slug },
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

      await logActivity(undefined, {
        userId: session.user.id,
        projectId: project.id,
        action: "PROJECT_MEMBER_REMOVED",
        metadata: {
          description: `Removed member '${targetName}' from project '${project.name}'`,
          entity: { type: "project", id: project.id, name: project.name },
          target: { type: "member", id: userId, name: targetName },
          context: { projectId: project.id, projectName: project.name, projectSlug: slug },
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
