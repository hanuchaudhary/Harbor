import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };
export default prisma;
export { PrismaClient };
export * from "./generated/prisma/enums";
export type { Prisma } from "./generated/prisma/client";
export { Prisma as PrismaNamespace } from "./generated/prisma/client";
