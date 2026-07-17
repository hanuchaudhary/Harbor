-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_milestoneId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Task_milestoneId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN IF EXISTS "milestoneId";

-- DropTable
DROP TABLE IF EXISTS "Milestone";

-- DropEnum
DROP TYPE IF EXISTS "MilestoneStatus";
