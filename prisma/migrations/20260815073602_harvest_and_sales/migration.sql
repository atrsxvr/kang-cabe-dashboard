/*
  Warnings:

  - You are about to drop the column `gradeA` on the `HarvestLog` table. All the data in the column will be lost.
  - You are about to drop the column `gradeB` on the `HarvestLog` table. All the data in the column will be lost.
  - You are about to drop the column `gradeC` on the `HarvestLog` table. All the data in the column will be lost.
  - You are about to drop the column `weightKg` on the `HarvestLog` table. All the data in the column will be lost.
  - You are about to drop the column `harvestLogId` on the `SaleTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerKg` on the `SaleTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `SaleTransaction` table. All the data in the column will be lost.
  - Added the required column `seasonId` to the `SaleTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `soldAt` to the `SaleTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChiliGrade" AS ENUM ('GOOD', 'REJECT');

-- DropForeignKey
ALTER TABLE "SaleTransaction" DROP CONSTRAINT "SaleTransaction_harvestLogId_fkey";

-- DropIndex
DROP INDEX "SaleTransaction_harvestLogId_idx";

-- AlterTable
ALTER TABLE "HarvestLog" DROP COLUMN "gradeA",
DROP COLUMN "gradeB",
DROP COLUMN "gradeC",
DROP COLUMN "weightKg",
ADD COLUMN     "goodKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "rejectKg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SaleTransaction" DROP COLUMN "harvestLogId",
DROP COLUMN "pricePerKg",
DROP COLUMN "totalAmount",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "seasonId" TEXT NOT NULL,
ADD COLUMN     "soldAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "Grade";

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "grade" "ChiliGrade" NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" INTEGER NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_saleId_grade_key" ON "SaleItem"("saleId", "grade");

-- CreateIndex
CREATE INDEX "HarvestLog_recordedById_idx" ON "HarvestLog"("recordedById");

-- CreateIndex
CREATE INDEX "SaleTransaction_seasonId_idx" ON "SaleTransaction"("seasonId");

-- CreateIndex
CREATE INDEX "SaleTransaction_seasonId_soldAt_idx" ON "SaleTransaction"("seasonId", "soldAt");

-- CreateIndex
CREATE INDEX "SaleTransaction_buyerName_idx" ON "SaleTransaction"("buyerName");

-- CreateIndex
CREATE INDEX "SaleTransaction_recordedById_idx" ON "SaleTransaction"("recordedById");

-- AddForeignKey
ALTER TABLE "HarvestLog" ADD CONSTRAINT "HarvestLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTransaction" ADD CONSTRAINT "SaleTransaction_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTransaction" ADD CONSTRAINT "SaleTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SaleTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
