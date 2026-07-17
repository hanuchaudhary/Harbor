import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, {
      message: "Password must be at least 6 characters",
    })
    .max(100, {
      message: "Password must be at most 100 characters",
    }),
});
export type RegisterType = z.infer<typeof registerSchema>;

export const inviteSchema = z.object({
  emails: z
    .array(z.string().email({ message: "Invalid email address" }))
    .min(1, { message: "At least one email is required" }),
  projectId: z.string().optional(),
  role: z.enum(["ADMIN", "PARTNER", "PROJECT_MANAGER", "DEVELOPER", "CLIENT"], {
    message:
      "Role must be one of ADMIN, PARTNER, PROJECT_MANAGER, DEVELOPER, CLIENT",
  }),
  expiry: z
    .enum(["15MIN", "1H", "1D", "7D"], {
      message: "Expiry must be one of 15MIN, 1H, 1D, 7D",
    })
    .optional(),
});
export type InviteType = z.infer<typeof inviteSchema>;

export const updateInviteSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  projectId: z.string().optional(),
  role: z.enum(["ADMIN", "PARTNER", "PROJECT_MANAGER", "DEVELOPER", "CLIENT"], {
    message:
      "Role must be one of ADMIN, PARTNER, PROJECT_MANAGER, DEVELOPER, CLIENT",
  }),
  expiry: z
    .enum(["15MIN", "1H", "1D", "7D"], {
      message: "Expiry must be one of 15MIN, 1H, 1D, 7D",
    })
    .optional(),
});
export type UpdateInviteType = z.infer<typeof updateInviteSchema>;

export const verifyInviteSchema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(100, { message: "Password must be at most 100 characters" }),
});

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
  image: z.string().url({ message: "Avatar must be a valid URL" }).optional(),
});

export type UpdateUserProfileType = z.infer<typeof updateUserProfileSchema>;
export const projectSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Project name is required" })
    .max(200, { message: "Project name must be at most 200 characters" }),
  description: z
    .string()
    .max(5000, { message: "Description must be at most 5000 characters" })
    .optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  budget: z.union([z.number(), z.string()]).pipe(z.coerce.number()).optional(),
  currency: z.enum(["USD", "EUR", "INR", "AED"]).optional(),
  slug: z
    .string()
    .min(1, { message: "Slug is required" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must be lowercase and use hyphens only",
    }),
  startDate: z.string().optional(),
  repos: z
    .array(
      z.object({
        name: z.string().min(1, { message: "Repo name is required" }),
        url: z.string().min(1, { message: "Repo URL is required" }),
      }),
    )
    .optional(),
  estimatedEndAt: z.string().optional(),
});
export type ProjectType = z.infer<typeof projectSchema>;

export const updateProjectSchema = projectSchema.partial();
export type UpdateProjectType = z.infer<typeof updateProjectSchema>;

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
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  currency: z.enum(["USD", "EUR", "INR", "AED"]).optional(),
  budget: z.union([z.number(), z.string()]).pipe(z.coerce.number()).optional(),
  startDate: z.string().optional(),
  estimatedEndAt: z.string().optional(),
  repos: z
    .array(
      z.object({
        name: z.string().min(1, { message: "Repo name is required" }),
        url: z.string().min(1, { message: "Repo URL is required" }),
      }),
    )
    .optional(),
});

export type ProjectDetailsType = z.infer<typeof projectDetailsSchema>;

export const timeLogManualSchema = z.object({
  duration: z
    .number({ message: "Duration must be a number" })
    .int()
    .positive({ message: "Duration must be positive" }),
  type: z.enum(["MANUAL", "AUTO"], { message: "Type must be MANUAL or AUTO" }),
  note: z
    .string()
    .max(2000, { message: "Note must be at most 2000 characters" })
    .optional(),
  startedAt: z.string().optional(),
});
export type TimeLogManualType = z.infer<typeof timeLogManualSchema>;

export const timeLogTimerSchema = z.object({
  type: z.enum(["MANUAL", "AUTO"], { message: "Type must be MANUAL or AUTO" }),
  note: z
    .string()
    .max(2000, { message: "Note must be at most 2000 characters" })
    .optional(),
});
export type TimeLogTimerType = z.infer<typeof timeLogTimerSchema>;

export const timeLogUpdateSchema = z.object({
  duration: z.number().int().positive().optional(),
  note: z.string().max(2000).optional(),
  type: z.enum(["MANUAL", "AUTO"]).optional(),
});
export type TimeLogUpdateType = z.infer<typeof timeLogUpdateSchema>;

export const createChannelSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Channel name is required" })
    .max(100, { message: "Channel name must be at most 100 characters" }),
  description: z
    .string()
    .max(500, { message: "Description must be at most 500 characters" })
    .optional(),
  type: z.enum([
    "ALL",
    "PROJECT_MANAGERS",
    "PROJECT_DEV_PM",
    "PROJECT_CLIENT_PM",
    "PROJECT_CLIENT_ADMIN",
    "ANNOUNCEMENT",
  ]),
  projectId: z.string().optional(),
});
export type CreateChannelType = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Channel name is required" })
    .max(100, { message: "Channel name must be at most 100 characters" })
    .optional(),
  description: z
    .string()
    .max(500, { message: "Description must be at most 500 characters" })
    .optional(),
  isActive: z.boolean().optional(),
});
export type UpdateChannelType = z.infer<typeof updateChannelSchema>;

export const createMessageSchema = z
  .object({
    content: z
      .string()
      .max(5000, { message: "Message must be at most 5000 characters" })
      .optional(),
    channelId: z.string().min(1, { message: "Channel ID is required" }),
    mediaUrls: z.array(z.string().url()).optional(),
    mentions: z.array(z.string()).optional(),
    replyToId: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.content && data.content.trim()) ||
      (data.mediaUrls && data.mediaUrls.length > 0),
    {
      message: "Either message content or attachments are required",
    },
  );
export type CreateMessageType = z.infer<typeof createMessageSchema>;

export const updateMessageSchema = z.object({
  content: z
    .string()
    .min(1, { message: "Message content is required" })
    .max(5000, { message: "Message must be at most 5000 characters" }),
});
export type UpdateMessageType = z.infer<typeof updateMessageSchema>;
