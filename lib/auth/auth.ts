import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import "dotenv/config";
import { Resend } from "resend";

import { PasswordResetEmailTemplate } from "@/components/email/reset-template";
import prisma from "../prisma";
import { comparePassword, hashPassword } from "../utils";
import { getGithubUsername } from "../actions/github";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    sendResetPassword: async ({ user, url, token }, request) => {
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
            subject: "Internal Password Reset Request",
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
      // async mapProfileToUser(profile) {
      //   console.log("ptofile ", profile);
      //   return {
      //     githubUsername: profile.login,
      //   };
      // },
    },
  },
  databaseHooks: {
    account: {
      create: {
        async after(account, context) {
          // console.log("Account: ", account);
          // console.log("Contxt: ", context);

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
        async after(account, context) {
          // console.log("Account: ", account);
          // console.log("Contxt: ", context);
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
