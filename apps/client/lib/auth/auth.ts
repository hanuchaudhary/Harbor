import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import "dotenv/config";
import { Resend } from "resend";

import { OrgInviteEmailTemplate } from "@/components/email/org-invite-template";
import { PasswordResetEmailTemplate } from "@/components/email/reset-template";
import prisma from "@repo/db";
import { comparePassword, hashPassword } from "../utils";
import { getGithubUsername } from "../actions/github";
import { ac, orgRoles } from "./permissions";

const resend = new Resend(process.env.RESEND_API_KEY);
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  "http://localhost:3000";

export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        fieldName: "role",
      },
      githubUsername: {
        type: "string",
        fieldName: "githubUsername",
      },
      isDesigner: {
        type: "boolean",
        fieldName: "isDesigner",
      },
    },
  },
  session: {
    additionalFields: {
      role: {
        type: "string",
        fieldName: "role",
      },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    password: {
      hash: async (password: string) => {
        return await hashPassword(password);
      },
      verify: async ({
        password,
        hash,
      }: {
        password: string;
        hash: string;
      }) => {
        const isValid = await comparePassword(password, hash);
        return isValid;
      },
    },
    sendResetPassword: async ({ user, url }) => {
      try {
        const emailHtml = await render(
          PasswordResetEmailTemplate({
            email: user.email,
            resetUrl: url,
          }),
        );

        await resend.emails
          .send({
            from: "Harbor <noreply@oceanlab.com>",
            to: user.email,
            subject: "Password Reset Request",
            html: emailHtml,
          })
          .catch((error) => {
            console.error("Resend email error:", error);
          });
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["repo", "read:org", "user:email"],
    },
  },
  plugins: [
    organization({
      ac,
      roles: orgRoles,
      creatorRole: "ADMIN",
      schema: {
        organization: {
          additionalFields: {
            onboardingCompletedAt: {
              type: "date",
              required: false,
              input: false,
            },
          },
        },
      },
      async sendInvitationEmail(data) {
        const inviteLink = `${appUrl}/accept-invite?invitationId=${data.id}`;
        try {
          const emailHtml = await render(
            OrgInviteEmailTemplate({
              email: data.email,
              organizationName: data.organization.name,
              invitedByUsername: data.inviter.user.name || data.inviter.user.email,
              inviteLink,
              role: data.role || "DEVELOPER",
            }),
          );

          await resend.emails
            .send({
              from: "Harbor <noreply@oceanlab.com>",
              to: data.email,
              subject: `Join ${data.organization.name} on Harbor`,
              html: emailHtml,
            })
            .catch((error) => {
              console.error("Org invite email error:", error);
            });
        } catch (error) {
          console.error("Failed to send org invitation email:", error);
        }
      },
    }),
  ],
  databaseHooks: {
    account: {
      create: {
        async after(account) {
          if (account.providerId === "github" && account.accessToken) {
            const ghUsername = await getGithubUsername(account.accessToken);
            await prisma.user.update({
              where: { id: account.userId },
              data: { githubUsername: ghUsername },
            });
          }
        },
      },
      update: {
        async after(account) {
          if (account.providerId === "github" && account.accessToken) {
            const ghUsername = await getGithubUsername(account.accessToken);
            await prisma.user.update({
              where: { id: account.userId },
              data: { githubUsername: ghUsername },
            });
          }
        },
      },
    },
  },
});
