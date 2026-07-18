import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be at most 100 characters" }),
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(100, { message: "Password must be at most 100 characters" }),
});
export type RegisterType = z.infer<typeof registerSchema>;

export const orgDetailsSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Organization name is required" })
    .max(100, { message: "Name must be at most 100 characters" }),
  slug: z
    .string()
    .min(2, { message: "Slug must be at least 2 characters" })
    .max(60, { message: "Slug must be at most 60 characters" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens",
    }),
});
export type OrgDetailsType = z.infer<typeof orgDetailsSchema>;

export const onboardingInviteSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.email({ message: "Invalid email address" }),
        role: z.enum(
          ["ADMIN", "PARTNER", "PROJECT_MANAGER", "DEVELOPER", "CLIENT"],
          { message: "Invalid role" },
        ),
      }),
    )
    .max(20),
});
export type OnboardingInviteType = z.infer<typeof onboardingInviteSchema>;

export const orgRoleSchema = z.enum([
  "ADMIN",
  "PARTNER",
  "PROJECT_MANAGER",
  "DEVELOPER",
  "CLIENT",
]);
export type OrgRole = z.infer<typeof orgRoleSchema>;
