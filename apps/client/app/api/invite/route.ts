import { NextRequest, NextResponse } from "next/server";

import { Resend } from "resend";

import { generateRandomToken } from "@/lib/utils";
import { inviteSchema } from "@//validations/validation";
import prisma from "@repo/db";
import { InviteTemplate } from "@/components/email/invite-template";
import { logActivity } from "@/lib/actions/activity";
import {
  isOrgAdminOrPm,
  requireActiveMembership,
} from "@/lib/auth/org";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const membership = await requireActiveMembership();

  if ("error" in membership) {
    return NextResponse.json(
      { message: membership.error.message },
      { status: membership.error.status },
    );
  }

  if (!isOrgAdminOrPm(membership.memberRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { session, organizationId } = membership;

  try {
    const payload = await request.json();
    const { error, data } = inviteSchema.safeParse(payload);

    if (error) {
      return NextResponse.json(
        { message: "Invalid input", errors: error.message },
        { status: 400 },
      );
    }

    const project = data.projectId
      ? await prisma.project.findFirst({
        where: { id: data.projectId, organizationId },
        select: { id: true, name: true, slug: true },
      })
      : null;

    if (data.projectId) {
      if (!project) {
        return NextResponse.json(
          { message: "Project not found" },
          { status: 404 },
        );
      }
    }

    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: data.emails,
        },
      },
      select: {
        email: true,
      },
    });

    const existingUserEmails = existingUsers.map((u) => u.email);
    if (existingUserEmails.length > 0) {
      return NextResponse.json(
        {
          message: `Cannot invite users with existing accounts: ${existingUserEmails.join(", ")}`,
        },
        { status: 409 },
      );
    }

    await prisma.invite.updateMany({
      where: {
        email: {
          in: data.emails,
        },
        projectId: data.projectId,
        used: false,
        expiry: {
          gt: new Date(),
        },
      },
      data: {
        expiry: new Date(),
      },
    });

    const now = new Date();
    let expiry = new Date(now.getTime() + 15 * 60000);

    if (data.expiry) {
      switch (data.expiry) {
        case "15MIN":
          expiry = new Date(now.getTime() + 15 * 60000);
          break;
        case "1H":
          expiry = new Date(now.getTime() + 60 * 60000);
          break;
        case "1D":
          expiry = new Date(now.getTime() + 24 * 60 * 60000);
          break;
        case "7D":
          expiry = new Date(now.getTime() + 7 * 24 * 60 * 60000);
          break;
      }
    }

    const invitesToCreate = data.emails.map((email) => ({
      organizationId,
      projectId: data.projectId || null,
      email,
      token: generateRandomToken(8),
      role: data.role,
      expiry: expiry.toISOString(),
      used: false,
    }));

    const invites = await prisma.invite.createMany({
      data: [...invitesToCreate],
      skipDuplicates: true,
    });

    if (!invites) {
      throw new Error("Failed to create invites");
    }

    for (const invite of invitesToCreate) {
      await logActivity(undefined, {
        userId: session.user.id,
        action: "INVITE_SENT",
        projectId: project?.id,
        metadata: {
          description: `Invited '${invite.email}' as ${invite.role.toLowerCase()}${project ? ` to project '${project.name}'` : ""}`,
          entity: { type: "invitation", name: invite.email },
          target: { type: "email", name: invite.email },
          ...(project && {
            context: {
              projectId: project.id,
              projectName: project.name,
              projectSlug: project.slug,
            },
          }),
        },
      });
    }

    try {
      if (invites.count === 1) {
        const invite = invitesToCreate[0];
        const projectName = project?.name ?? "our platform";

        await resend.emails.send({
          from: "Harbor <ocean@oceanlab.in>",
          to: invite.email,
          subject: projectName
            ? `You've been invited to join ${projectName}`
            : "You've been invited to join our platform",
          react: InviteTemplate({
            email: invite.email,
            projectName: projectName || "our platform",
            inviteToken: invite.token,
            expiryDate: invite.expiry,
            role: invite.role,
          }),
        });
        console.log("Email sent to:", invite.email);
      } else {
        const projectName = project?.name ?? "our platform";

        await resend.batch.send(
          invitesToCreate.map((invite) => ({
            from: "Harbor <ocean@oceanlab.in>",
            to: invite.email,
            subject: projectName
              ? `You've been invited to join ${projectName}`
              : "You've been invited to join our platform",
            react: InviteTemplate({
              email: invite.email,
              projectName: projectName || "our platform",
              inviteToken: invite.token,
              expiryDate: invite.expiry,
              role: invite.role,
            }),
          })),
        );
        console.log(
          "Batch email sent to:",
          invitesToCreate.map((i) => i.email),
        );
      }
    } catch (emailError) {
      console.error("Failed to send invitation emails:", emailError);
    }

    return NextResponse.json({
      message: `${invites.count} invite(s) created successfully`,
      data: invitesToCreate.map((invite) => ({
        email: invite.email,
        role: invite.role,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const membership = await requireActiveMembership();

  if ("error" in membership) {
    return NextResponse.json(
      { message: membership.error.message },
      { status: membership.error.status },
    );
  }

  if (!isOrgAdminOrPm(membership.memberRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const used = searchParams.get("used") || "";
    const skip = (page - 1) * limit;

    const where = {
      organizationId: membership.organizationId,
      ...(search && {
        email: {
          contains: search,
          mode: "insensitive" as const,
        },
      }),
      ...(role && { role: role as any }),
      ...(used !== "" && { used: used === "true" }),
    };

    const [invites, total] = await Promise.all([
      prisma.invite.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invite.count({ where }),
    ]);

    return NextResponse.json(
      {
        invites,
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
