import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1).max(50),
});
export type CreateTagType = z.infer<typeof createTagSchema>;

export const updateTagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).max(50).optional(),
});
export type UpdateTagType = z.infer<typeof updateTagSchema>;

export const deleteTagSchema = z.object({
  id: z.string().min(1),
});
export type DeleteTagType = z.infer<typeof deleteTagSchema>;
