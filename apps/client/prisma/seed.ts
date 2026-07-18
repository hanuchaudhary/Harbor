import prisma from "@/lib/prisma";
import { createDefaultChannels } from "@/lib/actions/channels";

export async function main() {
  await createDefaultChannels();
  console.log("Seeding completed!");
}

main();
