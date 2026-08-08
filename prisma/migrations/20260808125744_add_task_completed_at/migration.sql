-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_seasonId_completedAt_idx" ON "Task"("seasonId", "completedAt");
