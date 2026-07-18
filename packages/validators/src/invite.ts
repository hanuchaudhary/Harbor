import { z } from "zod";

import { orgRoleSchema } from "./auth";

export const inviteSchema = z.object({
  emails: z
    .array(z.email({ message: "Invalid email address" }))
    .min(1, { message: "At least one email is required" }),
  projectId: z.string().optional(),
  role: orgRoleSchema,
  expiry: z.enum(["15MIN", "1H", "1D", "7D"]).optional(),
});
export type InviteType = z.infer<typeof inviteSchema>;

export const updateInviteSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  projectId: z.string().optional(),
  role: orgRoleSchema,
  expiry: z.enum(["15MIN", "1H", "1D", "7D"]).optional(),
});
export type UpdateInviteType = z.infer<typeof updateInviteSchema>;

export const verifyInviteSchema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(100, { message: "Password must be at most 100 characters" }),
});
export type VerifyInviteType = z.infer<typeof verifyInviteSchema>;
