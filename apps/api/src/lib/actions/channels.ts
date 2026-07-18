import { prisma } from "@repo/db";
import { ChannelType } from "@repo/db/enums";

export async function createDefaultChannels() {
  const existingChannels = await prisma.channel.findMany({
    where: {
      type: {
        in: [
          ChannelType.ALL,
          ChannelType.PROJECT_MANAGERS,
          ChannelType.ANNOUNCEMENT,
        ],
      },
    },
  });

  if (existingChannels.length > 0) {
    console.log("Default channels already exist. Skipping creation.");
    return;
  }

  try {
    await prisma.channel.createMany({
      data: [
        {
          name: "All",
          description: "General channel for everyone",
          type: ChannelType.ALL,
          isActive: true,
        },
        {
          name: "Project Managers",
          description: "Channel for project managers only",
          type: ChannelType.PROJECT_MANAGERS,
          isActive: true,
        },
        {
          name: "Announcements",
          description: "Important announcements and updates",
          type: ChannelType.ANNOUNCEMENT,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });
  } catch (error) {
    console.log("Error creating default channels:", error);
  }
}

export async function createProjectChannels(
  tx: any,
  projectId: string,
  projectName: string,
) {
  await tx.channel.createMany({
    data: [
      {
        name: `${projectName} - Team`,
        description: `Internal team collaboration space for developers and project managers`,
        type: ChannelType.PROJECT_DEV_PM,
        projectId,
        isActive: true,
      },
      {
        name: `${projectName} - Client`,
        description: `Communication channel between clients and project managers`,
        type: ChannelType.PROJECT_CLIENT_PM,
        projectId,
        isActive: true,
      },
      {
        name: `${projectName} - Private`,
        description: `Private channel for confidential discussions between clients and admins`,
        type: ChannelType.PROJECT_CLIENT_ADMIN,
        projectId,
        isActive: true,
      },
    ],
  });
}
