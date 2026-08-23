-- CreateEnum
CREATE TYPE "PlantEventType" AS ENUM ('DIED', 'REPLANTED');

-- CreateTable
CREATE TABLE "PlantEvent" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "type" "PlantEventType" NOT NULL,
    "count" INTEGER NOT NULL,
    "cause" TEXT,
    "findingId" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestLoss" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "lostAt" TIMESTAMP(3) NOT NULL,
    "grade" "ChiliGrade" NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HarvestLoss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantEvent_seasonId_idx" ON "PlantEvent"("seasonId");

-- CreateIndex
CREATE INDEX "PlantEvent_seasonId_eventDate_idx" ON "PlantEvent"("seasonId", "eventDate");

-- CreateIndex
CREATE INDEX "PlantEvent_findingId_idx" ON "PlantEvent"("findingId");

-- CreateIndex
CREATE INDEX "PlantEvent_recordedById_idx" ON "PlantEvent"("recordedById");

-- CreateIndex
CREATE INDEX "HarvestLoss_seasonId_idx" ON "HarvestLoss"("seasonId");

-- CreateIndex
CREATE INDEX "HarvestLoss_seasonId_lostAt_idx" ON "HarvestLoss"("seasonId", "lostAt");

-- CreateIndex
CREATE INDEX "HarvestLoss_recordedById_idx" ON "HarvestLoss"("recordedById");

-- AddForeignKey
ALTER TABLE "PlantEvent" ADD CONSTRAINT "PlantEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantEvent" ADD CONSTRAINT "PlantEvent_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "HealthLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantEvent" ADD CONSTRAINT "PlantEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestLoss" ADD CONSTRAINT "HarvestLoss_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestLoss" ADD CONSTRAINT "HarvestLoss_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
