import { z } from "zod";

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
    mediaUrls: z.array(z.url()).optional(),
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

export const messagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});
export type MessagesQueryType = z.infer<typeof messagesQuerySchema>;
