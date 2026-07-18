import { NextRequest, NextResponse } from "next/server";

import { verifyInviteSchema } from "@/validations/validation";
import prisma from "@repo/db";
import { hashPassword } from "@/lib/utils";
import { logActivity } from "@/lib/actions/activity";

export async function POST(request: NextRequest) {
  try {
    const { data, error } = verifyInviteSchema.safeParse(await request.json());
    if (error) {
      return NextResponse.json(
        { message: "Invalid input", errors: error.message },
        { status: 400 },
      );
    }

    const invite = await prisma.invite.findUnique({
      where: { token: data.token },
      include: { project: { select: { name: true, slug: true } } },
    });

    if (!invite) {
      return NextResponse.json(
        { message: "Invite not found" },
        { status: 404 },
      );
    }

    if (invite.used) {
      return NextResponse.json(
        { message: "Invite already used" },
        { status: 400 },
      );
    }

    if (new Date(invite.expiry) < new Date()) {
      return NextResponse.json(
        { message: "Invite has expired" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(data.password);

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invite.email,
          password: hashedPassword,
          name: invite.email.split("@")[0],
          role: invite.role,
        },
      });

      await tx.account.create({
        data: {
          accountId: user.id,
          userId: user.id,
          password: hashedPassword,
          providerId: "credential",
          type: "oauth",
        },
      });

      await tx.member.create({
        data: {
          organizationId: invite.organizationId,
          userId: user.id,
          role: invite.role,
        },
      });

      if (invite.projectId) {
        if (invite.role === "CLIENT") {
          await tx.projectClient.create({
            data: { projectId: invite.projectId, userId: user.id },
          });
        } else {
          await tx.projectMember.create({
            data: { projectId: invite.projectId, userId: user.id },
          });
        }
      }

      await tx.invite.update({
        where: { id: invite.id },
        data: { used: true },
      });

      const context = invite.projectId
        ? {
            projectId: invite.projectId,
            projectName: invite.project?.name,
            projectSlug: invite.project?.slug,
          }
        : undefined;
      await logActivity(tx, {
        userId: user.id,
        action: "USER_CREATED",
        projectId: invite.projectId ?? undefined,
        metadata: {
          description: `Created account as ${invite.role.toLowerCase()}`,
          entity: { type: "user", id: user.id, name: user.name },
          context,
        },
      });
      await logActivity(tx, {
        userId: user.id,
        action: "INVITE_ACCEPTED",
        projectId: invite.projectId ?? undefined,
        metadata: {
          description: `Accepted invitation${invite.project ? ` to project '${invite.project.name}'` : ""}`,
          entity: { type: "invitation", id: invite.id },
          target: { type: "user", id: user.id, name: user.name },
          context,
        },
      });

      return user;
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 },
    );
  }
}
