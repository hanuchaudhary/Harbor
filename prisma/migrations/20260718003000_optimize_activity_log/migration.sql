-- CreateIndex
CREATE INDEX "ActivityLog_projectId_createdAt_idx"
ON "ActivityLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_taskId_createdAt_idx"
ON "ActivityLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx"
ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx"
ON "ActivityLog"("action", "createdAt");
