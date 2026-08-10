-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "avgCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "totalCost" INTEGER;

-- AlterTable
ALTER TABLE "TaskMaterial" ADD COLUMN     "totalCost" INTEGER;

-- AlterTable
ALTER TABLE "ToolEvent" ADD COLUMN     "totalCost" INTEGER;
