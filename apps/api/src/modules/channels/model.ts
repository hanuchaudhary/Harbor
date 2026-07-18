/**
 * Channels models — Zod schemas from @repo/validators (shared with client).
 * Controllers can use these for Elysia Standard Schema validation.
 */
export {
  createChannelSchema,
  updateChannelSchema,
  createMessageSchema,
  updateMessageSchema,
  messagesQuerySchema,
  type CreateChannelType,
  type UpdateChannelType,
  type CreateMessageType,
  type UpdateMessageType,
  type MessagesQueryType,
} from "@repo/validators";
