-- AlterTable
ALTER TABLE "TimeLog" ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3);

-- Preserve elapsed time for timers that were already running at deployment.
UPDATE "TimeLog" AS timer
SET
  "duration" = timer."duration" + GREATEST(
    0,
    FLOOR(
      EXTRACT(
        EPOCH FROM (
          LEAST(NOW(), COALESCE("User"."lastSeenAt", NOW()))
          - COALESCE(timer."startedAt", NOW())
        )
      )
    )::INTEGER
  ),
  "lastHeartbeatAt" = NOW()
FROM "User"
WHERE
  timer."userId" = "User"."id"
  AND timer."isRunning" = TRUE;

-- CreateIndex
CREATE INDEX "TimeLog_isRunning_lastHeartbeatAt_idx"
ON "TimeLog"("isRunning", "lastHeartbeatAt");
