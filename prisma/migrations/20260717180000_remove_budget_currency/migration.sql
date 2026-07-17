-- AlterTable
ALTER TABLE "Project" DROP COLUMN IF EXISTS "budget";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "budgetUsd";

-- AlterTable
ALTER TABLE "Milestone" DROP COLUMN IF EXISTS "budgetAlloc";

-- DropEnum
DROP TYPE IF EXISTS "Currency";
