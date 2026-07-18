import { Prisma } from "@repo/db/client";

export async function createNotification(
  tx: Prisma.TransactionClient,
  data: {
    userId: string;
    title: string;
    body: string;
    link?: string;
  },
) {
  return tx.notification.create({ data });
}

export async function createNotifications(
  tx: Prisma.TransactionClient,
  userIds: string[],
  data: { title: string; body: string; link?: string },
) {
  if (userIds.length === 0) return;
  return tx.notification.createMany({
    data: userIds.map((userId) => ({ ...data, userId })),
    skipDuplicates: true,
  });
}
