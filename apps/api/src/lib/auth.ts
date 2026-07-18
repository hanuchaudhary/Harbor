import { prisma } from "@repo/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { openAPI } from "better-auth/plugins";

import { getGithubUsername } from "./actions/github";
import { ac, orgRoles } from "./permissions";
import { sendEmail } from "./resend";
import { comparePassword, hashPassword } from "./utils";

const appUrl =
  process.env.APP_URL ||
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
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    password: {
      hash: async (password: string) => hashPassword(password),
      verify: async ({
        password,
        hash,
      }: {
        password: string;
        hash: string;
      }) => comparePassword(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        from: "Harbor <noreply@oceanlab.com>",
        to: user.email,
        subject: "Password Reset Request",
        html: `<p>Hello ${user.name},</p><p>Reset your password: <a href="${url}">${url}</a></p>`,
      });
    },
  },
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        socialProviders: {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            scope: ["repo", "read:org", "user:email"],
          },
        },
      }
    : {}),
  plugins: [
    openAPI(),
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
        await sendEmail({
          from: "Harbor <noreply@oceanlab.com>",
          to: data.email,
          subject: `Join ${data.organization.name} on Harbor`,
          html: `<p>You've been invited to join <strong>${data.organization.name}</strong> as ${data.role || "DEVELOPER"} by ${data.inviter.user.name || data.inviter.user.email}.</p><p><a href="${inviteLink}">Accept invitation</a></p>`,
        });
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
  logger: {
    level: "info",
  },
});
