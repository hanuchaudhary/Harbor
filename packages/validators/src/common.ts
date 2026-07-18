import { z } from "zod";

export const notificationsQuerySchema = z.object({
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type NotificationsQueryType = z.infer<typeof notificationsQuerySchema>;

export const markNotificationsSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});
export type MarkNotificationsType = z.infer<typeof markNotificationsSchema>;

export const adminValidateSchema = z.object({
  key: z.string().min(1),
});
export type AdminValidateType = z.infer<typeof adminValidateSchema>;

export const presignedUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.string().optional(),
});
export type PresignedUploadType = z.infer<typeof presignedUploadSchema>;

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const slugParamSchema = z.object({
  slug: z.string().min(1),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().min(1),
});

export const channelIdParamSchema = z.object({
  channelId: z.string().min(1),
});

export const commentIdParamSchema = z.object({
  taskId: z.string().min(1),
  commentId: z.string().min(1),
});

export const subtaskIdParamSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
});

export const timeLogIdParamSchema = z.object({
  taskId: z.string().min(1),
  timeLogId: z.string().min(1),
});

export const messageIdParamSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
});
