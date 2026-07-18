import { z } from "zod";

export const taskStatusSchema = z.enum([
  "DISCUSSION",
  "IN_PLANNING",
  "TODO",
  "DESIGN",
  "DEVELOPMENT",
  "REVIEW",
  "CLIENT_REVIEW",
  "ON_HOLD",
  "COMPLETED",
]);

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  projectId: z.string().min(1),
  deadline: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  createGithubIssue: z.boolean().optional(),
});
export type CreateTaskType = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  deadline: z.string().optional().nullable(),
  order: z.number().int().optional(),
});
export type UpdateTaskType = z.infer<typeof updateTaskSchema>;

export const tasksQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type TasksQueryType = z.infer<typeof tasksQuerySchema>;

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int(),
      status: taskStatusSchema.optional(),
    }),
  ),
});
export type ReorderTasksType = z.infer<typeof reorderTasksSchema>;

export const updateAssigneesSchema = z.object({
  assigneeIds: z.array(z.string()),
});
export type UpdateAssigneesType = z.infer<typeof updateAssigneesSchema>;

export const updateTaskTagsSchema = z.object({
  tagIds: z.array(z.string()),
});
export type UpdateTaskTagsType = z.infer<typeof updateTaskTagsSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});
export type CreateCommentType = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});
export type UpdateCommentType = z.infer<typeof updateCommentSchema>;

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
  deadline: z.string().optional().nullable(),
});
export type CreateSubtaskType = z.infer<typeof createSubtaskSchema>;

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  isDone: z.boolean().optional(),
  deadline: z.string().optional().nullable(),
  order: z.number().int().optional(),
});
export type UpdateSubtaskType = z.infer<typeof updateSubtaskSchema>;

export const createDependencySchema = z.object({
  dependsOnTaskId: z.string().min(1),
});
export type CreateDependencyType = z.infer<typeof createDependencySchema>;

export const createAttachmentSchema = z.object({
  name: z.string().min(1),
  fileUrl: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
});
export type CreateAttachmentType = z.infer<typeof createAttachmentSchema>;

export const timeLogManualSchema = z.object({
  duration: z.number().int().positive({ message: "Duration must be positive" }),
  type: z.enum(["MANUAL", "AUTO"]),
  note: z.string().max(2000).optional(),
  startedAt: z.string().optional(),
});
export type TimeLogManualType = z.infer<typeof timeLogManualSchema>;

export const timeLogTimerSchema = z.object({
  type: z.enum(["MANUAL", "AUTO"]),
  note: z.string().max(2000).optional(),
});
export type TimeLogTimerType = z.infer<typeof timeLogTimerSchema>;

export const createTimeLogSchema = z.union([
  timeLogManualSchema,
  timeLogTimerSchema,
]);
export type CreateTimeLogType = z.infer<typeof createTimeLogSchema>;

export const timeLogUpdateSchema = z.object({
  duration: z.number().int().positive().optional(),
  note: z.string().max(2000).optional(),
  type: z.enum(["MANUAL", "AUTO"]).optional(),
  endedAt: z.string().optional().nullable(),
});
export type TimeLogUpdateType = z.infer<typeof timeLogUpdateSchema>;

export const heartbeatSchema = z.object({
  timeLogId: z.string().min(1).optional(),
});
export type HeartbeatType = z.infer<typeof heartbeatSchema>;

export const activePresenceSchema = z.object({
  status: z.string().optional(),
  taskId: z.string().optional().nullable(),
});
export type ActivePresenceType = z.infer<typeof activePresenceSchema>;
