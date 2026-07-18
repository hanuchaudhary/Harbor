import { z } from "zod";

const repoSchema = z.object({
  name: z.string().min(1, { message: "Repo name is required" }),
  url: z.string().min(1, { message: "Repo URL is required" }),
});

export const projectStatusSchema = z.enum([
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);

export const projectSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Project name is required" })
    .max(200, { message: "Project name must be at most 200 characters" }),
  description: z
    .string()
    .max(5000, { message: "Description must be at most 5000 characters" })
    .optional(),
  status: projectStatusSchema.optional(),
  slug: z
    .string()
    .min(1, { message: "Slug is required" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and use hyphens only",
    }),
  startDate: z.string().optional(),
  repos: z.array(repoSchema).optional(),
  estimatedEndAt: z.string().optional(),
  docs: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
      }),
    )
    .optional(),
  assets: z
    .array(
      z.object({
        name: z.string().min(1),
        url: z.string().min(1),
      }),
    )
    .optional(),
});
export type ProjectType = z.infer<typeof projectSchema>;

export const updateProjectSchema = projectSchema.partial();
export type UpdateProjectType = z.infer<typeof updateProjectSchema>;

export const onboardingProjectSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Project name is required" })
    .max(200, { message: "Project name must be at most 200 characters" }),
  slug: z
    .string()
    .min(1, { message: "Slug is required" })
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase letters, numbers, and hyphens",
    }),
  description: z.string().max(5000).optional(),
  status: projectStatusSchema.optional(),
});
export type OnboardingProjectType = z.infer<typeof onboardingProjectSchema>;

export const projectDetailsSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Project name is required" })
    .max(200, { message: "Project name must be at most 200 characters" }),
  slug: z
    .string()
    .min(1, { message: "Slug is required" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and use hyphens only",
    }),
  description: z
    .string()
    .max(5000, { message: "Description must be at most 5000 characters" })
    .optional(),
  status: projectStatusSchema.optional(),
  startDate: z.string().optional(),
  estimatedEndAt: z.string().optional(),
  repos: z.array(repoSchema).optional(),
});
export type ProjectDetailsType = z.infer<typeof projectDetailsSchema>;

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "PARTNER", "PROJECT_MANAGER", "DEVELOPER", "CLIENT"]),
});
export type AddProjectMemberType = z.infer<typeof addProjectMemberSchema>;

export const removeProjectMemberSchema = z.object({
  userId: z.string().min(1),
});
export type RemoveProjectMemberType = z.infer<typeof removeProjectMemberSchema>;

export const projectDocSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  id: z.string().optional(),
});
export type ProjectDocType = z.infer<typeof projectDocSchema>;

export const projectAssetSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  id: z.string().optional(),
});
export type ProjectAssetType = z.infer<typeof projectAssetSchema>;

export const projectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional().default(""),
  status: z.string().optional().default(""),
});
export type ProjectsQueryType = z.infer<typeof projectsQuerySchema>;

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  action: z.string().optional(),
  userId: z.string().optional(),
});
export type ActivityQueryType = z.infer<typeof activityQuerySchema>;
