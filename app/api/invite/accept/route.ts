import { NextRequest, NextResponse } from "next/server";

import { verifyInviteSchema } from "@/validations/validation";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/utils";

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

    const createdUser = await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data: {
          email: invite.email,
          password: hashedPassword,
          name: invite.email.split("@")[0],
          role: invite.role,
          isDesigner: invite.isDesigner,
        },
      });

      await prisma.account.create({
        data: {
          accountId: user.id,
          userId: user.id,
          password: hashedPassword,
          providerId: "credential",
          type: "oauth",
        },
      });

      if (invite.projectId) {
        if (invite.role === "CLIENT") {
          await prisma.projectClient.create({
            data: { projectId: invite.projectId, userId: user.id },
          });
        } else {
          await prisma.projectMember.create({
            data: { projectId: invite.projectId, userId: user.id },
          });
        }
      }

      await prisma.invite.update({
        where: { id: invite.id },
        data: { used: true },
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
