import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required" })
    .max(100, { message: "Name must be at most 100 characters" })
    .optional(),
  bio: z
    .string()
    .max(500, { message: "Bio must be at most 500 characters" })
    .optional(),
  image: z.url({ message: "Avatar must be a valid URL" }).optional(),
});
export type UpdateUserProfileType = z.infer<typeof updateUserProfileSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z
    .enum(["ADMIN", "PARTNER", "PROJECT_MANAGER", "DEVELOPER", "CLIENT"])
    .optional(),
  isDesigner: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserType = z.infer<typeof updateUserSchema>;
