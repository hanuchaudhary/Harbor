import { Prisma } from "@repo/db/client";
import { ACTIVITY_ACTION } from "@/types/types";
import { z } from "zod";
import prisma from "@repo/db";

const ActivityValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const ActivityMetadataSchema = z
  .object({
    version: z.literal(1).optional().default(1),
    description: z.string().trim().min(1),
    entity: z
      .object({
        type: z.string().trim().min(1),
        id: z.string().optional(),
        name: z.string().trim().min(1).optional(),
      })
      .optional(),
    context: z
      .object({
        projectId: z.string().optional(),
        projectName: z.string().optional(),
        projectSlug: z.string().optional(),
        taskId: z.string().optional(),
        taskTitle: z.string().optional(),
      })
      .optional(),
    target: z
      .object({
        type: z.string().trim().min(1),
        id: z.string().optional(),
        name: z.string().trim().min(1).optional(),
      })
      .optional(),
    changes: z
      .array(
        z.object({
          field: z.string().trim().min(1),
          label: z.string().trim().min(1).optional(),
          from: ActivityValueSchema.optional(),
          to: ActivityValueSchema.optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

/** Callers may omit `version`; parse() fills it in. */
export type ActivityMetadata = Omit<
  z.input<typeof ActivityMetadataSchema>,
  "version"
> & {
  version?: 1;
};

type ActivityClient = Prisma.TransactionClient | typeof prisma;

export async function logActivity(
  tx: Prisma.TransactionClient | null | undefined,
  data: {
    userId: string;
    action: ACTIVITY_ACTION;
    projectId?: string;
    taskId?: string;
    metadata: ActivityMetadata;
  },
) {
  const client: ActivityClient = tx ?? prisma;
  const metadata = ActivityMetadataSchema.parse(data.metadata);

  return client.activityLog.create({
    data: {
      ...data,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}
