/*
  Warnings:

  - You are about to alter the column `amount` on the `FinanceTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `pricePerKg` on the `SaleTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `totalAmount` on the `SaleTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ToolEventType" ADD VALUE 'CHECKED_OUT';
ALTER TYPE "ToolEventType" ADD VALUE 'RETURNED';

-- AlterTable
ALTER TABLE "FinanceTransaction" ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "purchaseSize" DOUBLE PRECISION,
ADD COLUMN     "purchaseUnit" TEXT;

-- AlterTable
ALTER TABLE "SaleTransaction" ALTER COLUMN "pricePerKg" SET DATA TYPE INTEGER,
ALTER COLUMN "totalAmount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "opnameId" TEXT,
ADD COLUMN     "seasonId" TEXT;

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "heldById" TEXT,
ADD COLUMN     "serviceIntervalDays" INTEGER;

-- CreateTable
CREATE TABLE "StockOpname" (
    "id" TEXT NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked" INTEGER NOT NULL,
    "corrected" INTEGER NOT NULL,
    "note" TEXT,
    "actorId" TEXT,

    CONSTRAINT "StockOpname_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockOpname_countedAt_idx" ON "StockOpname"("countedAt");

-- CreateIndex
CREATE INDEX "StockOpname_actorId_idx" ON "StockOpname"("actorId");

-- CreateIndex
CREATE INDEX "Material_archivedAt_idx" ON "Material"("archivedAt");

-- CreateIndex
CREATE INDEX "StockMovement_seasonId_idx" ON "StockMovement"("seasonId");

-- CreateIndex
CREATE INDEX "StockMovement_opnameId_idx" ON "StockMovement"("opnameId");

-- CreateIndex
CREATE INDEX "Tool_heldById_idx" ON "Tool"("heldById");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_opnameId_fkey" FOREIGN KEY ("opnameId") REFERENCES "StockOpname"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOpname" ADD CONSTRAINT "StockOpname_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_heldById_fkey" FOREIGN KEY ("heldById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
