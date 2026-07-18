import { Elysia } from "elysia";
import { prisma } from "@repo/db";
import { inviteSchema, verifyInviteSchema } from "./model";

import { logActivity } from "../../lib/actions/activity";
import {
  authError,
  badRequest,
  forbidden,
  notFound,
  serverError,
} from "../../lib/http";
import { isOrgAdminOrPm, requireActiveMembership } from "../../lib/org";
import { sendEmail } from "../../lib/resend";
import { formatDate, generateRandomToken, hashPassword } from "../../lib/utils";

const appUrl =
  process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";

function inviteEmailHtml(opts: {
  email: string;
  projectName: string;
  inviteToken: string;
  expiryDate: string;
  role: string;
}) {
  const inviteUrl = `${appUrl}/accept-invite?token=${opts.inviteToken}`;
  return `<p>You've been invited to join <strong>${opts.projectName}</strong> as ${opts.role}.</p>
<p>Email: ${opts.email}</p>
<p>Expires: ${opts.expiryDate}</p>
<p><a href="${inviteUrl}">Accept Invitation</a></p>
<p>Or copy this link: ${inviteUrl}</p>`;
}

export const inviteRoutes = new Elysia({
  prefix: "/api/invite",
  tags: ["Invite"],
})
  .post("/", async ({ request, set }) => {
    const membership = await requireActiveMembership(request.headers);
    if ("error" in membership) return authError(set, membership.error);
    if (!isOrgAdminOrPm(membership.memberRole)) return forbidden(set);

    const { session, organizationId } = membership;

    try {
      const payload = await request.json();
      const { error, data } = inviteSchema.safeParse(payload);

      if (error) {
        set.status = 400;
        return { message: "Invalid input", errors: error.message };
      }

      const project = data.projectId
        ? await prisma.project.findFirst({
            where: { id: data.projectId, organizationId },
            select: { id: true, name: true, slug: true },
          })
        : null;

      if (data.projectId && !project) {
        return notFound(set, "Project not found");
      }

      const existingUsers = await prisma.user.findMany({
        where: { email: { in: data.emails } },
        select: { email: true },
      });

      const existingUserEmails = existingUsers.map((u) => u.email);
      if (existingUserEmails.length > 0) {
        set.status = 409;
        return {
          message: `Cannot invite users with existing accounts: ${existingUserEmails.join(", ")}`,
        };
      }

      await prisma.invite.updateMany({
        where: {
          email: { in: data.emails },
          projectId: data.projectId,
          used: false,
          expiry: { gt: new Date() },
        },
        data: { expiry: new Date() },
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

      if (!invites) throw new Error("Failed to create invites");

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

      const projectName = project?.name ?? "our platform";
      const subject = projectName
        ? `You've been invited to join ${projectName}`
        : "You've been invited to join our platform";

      for (const invite of invitesToCreate) {
        await sendEmail({
          from: "Harbor <ocean@oceanlab.in>",
          to: invite.email,
          subject,
          html: inviteEmailHtml({
            email: invite.email,
            projectName: projectName || "our platform",
            inviteToken: invite.token,
            expiryDate: formatDate(invite.expiry, { includeTime: true }),
            role: invite.role,
          }),
        });
      }

      return {
        message: `${invites.count} invite(s) created successfully`,
        data: invitesToCreate.map((invite) => ({
          email: invite.email,
          role: invite.role,
        })),
      };
    } catch (error) {
      return serverError(set, error);
    }
  })
  .get("/", async ({ request, set }) => {
    const membership = await requireActiveMembership(request.headers);
    if ("error" in membership) return authError(set, membership.error);
    if (!isOrgAdminOrPm(membership.memberRole)) return forbidden(set);

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
          email: { contains: search, mode: "insensitive" as const },
        }),
        ...(role && { role: role as never }),
        ...(used !== "" && { used: used === "true" }),
      };

      const [invites, total] = await Promise.all([
        prisma.invite.findMany({
          where,
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.invite.count({ where }),
      ]);

      return {
        invites,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return serverError(set, error);
    }
  })
  .post("/accept", async ({ request, set }) => {
    try {
      const { data, error } = verifyInviteSchema.safeParse(
        await request.json(),
      );
      if (error) {
        set.status = 400;
        return { message: "Invalid input", errors: error.message };
      }

      const invite = await prisma.invite.findUnique({
        where: { token: data.token },
        include: { project: { select: { name: true, slug: true } } },
      });

      if (!invite) return notFound(set, "Invite not found");

      if (invite.used) return badRequest(set, "Invite already used");

      if (new Date(invite.expiry) < new Date()) {
        return badRequest(set, "Invite has expired");
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: invite.email },
      });

      if (existingUser) {
        set.status = 409;
        return { message: "User already exists" };
      }

      const hashedPassword = await hashPassword(data.password);

      const createdUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: invite.email,
            password: hashedPassword,
            name: invite.email.split("@")[0] ?? "",
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

      set.status = 201;
      return {
        message: "User created successfully",
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
        },
      };
    } catch (error) {
      set.status = 500;
      return { message: "Internal server error", error };
    }
  });
