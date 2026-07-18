-- AlterTable
ALTER TABLE "Session" ADD COLUMN "activeOrganizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboardingCompletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateDefaultOrg for existing projects/invites (greenfield-safe)
INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "onboardingCompletedAt")
VALUES ('org_default_harbor', 'Harbor', 'harbor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable Project
ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;

UPDATE "Project" SET "organizationId" = 'org_default_harbor' WHERE "organizationId" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_slug_key";

CREATE UNIQUE INDEX "Project_organizationId_slug_key" ON "Project"("organizationId", "slug");

CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Invite
ALTER TABLE "Invite" ADD COLUMN "organizationId" TEXT;

UPDATE "Invite" SET "organizationId" = 'org_default_harbor' WHERE "organizationId" IS NULL;

ALTER TABLE "Invite" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "Invite_organizationId_idx" ON "Invite"("organizationId");

ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes / FKs for org tables
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE UNIQUE INDEX "Member_organizationId_userId_key" ON "Member"("organizationId", "userId");

CREATE INDEX "Member_userId_idx" ON "Member"("userId");

CREATE INDEX "Member_organizationId_idx" ON "Member"("organizationId");

CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");

CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
