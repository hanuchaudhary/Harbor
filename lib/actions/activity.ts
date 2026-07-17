import { Prisma } from "@/generated/prisma/client";
import { ACTIVITY_ACTION } from "@/types/types";
import prisma from "../prisma";

export interface ActivityMetadata {
  description: string;
  [key: string]: any;
}

export async function logActivity(
  tx: Prisma.TransactionClient,
  data: {
    userId: string;
    action: ACTIVITY_ACTION;
    projectId?: string;
    taskId?: string;
    metadata: ActivityMetadata;
  },
) {
  return tx
    ? tx.activityLog.create({
        data: {
          ...data,
          metadata: data.metadata,
        },
      })
    : prisma.activityLog.create({
        data: {
          ...data,
          metadata: data.metadata,
        },
      });
}
