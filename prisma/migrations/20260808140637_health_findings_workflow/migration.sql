/*
  Warnings:

  - You are about to drop the column `isResolved` on the `HealthLog` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('REPORTED', 'DIAGNOSED', 'TREATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- DropIndex
DROP INDEX "HealthLog_seasonId_isResolved_idx";

-- AlterTable
ALTER TABLE "HealthLog" DROP COLUMN "isResolved",
ADD COLUMN     "diagnosedAt" TIMESTAMP(3),
ADD COLUMN     "diagnosedById" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "reportedById" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "status" "FindingStatus" NOT NULL DEFAULT 'REPORTED';

-- CreateIndex
CREATE INDEX "HealthLog_seasonId_status_idx" ON "HealthLog"("seasonId", "status");

-- CreateIndex
CREATE INDEX "HealthLog_reportedById_idx" ON "HealthLog"("reportedById");

-- CreateIndex
CREATE INDEX "HealthLog_diagnosedById_idx" ON "HealthLog"("diagnosedById");

-- AddForeignKey
ALTER TABLE "HealthLog" ADD CONSTRAINT "HealthLog_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthLog" ADD CONSTRAINT "HealthLog_diagnosedById_fkey" FOREIGN KEY ("diagnosedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
