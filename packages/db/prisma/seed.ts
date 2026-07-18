import { ChannelType, prisma } from "../src/index";

async function createDefaultChannels() {
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
}

async function main() {
  await createDefaultChannels();
  console.log("Seeding completed!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
