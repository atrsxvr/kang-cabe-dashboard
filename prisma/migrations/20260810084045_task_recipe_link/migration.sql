-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "recipeId" TEXT,
ADD COLUMN     "recipeVolumeL" DOUBLE PRECISION,
ADD COLUMN     "usageRecordedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaskMaterial" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TaskMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskMaterial_materialId_idx" ON "TaskMaterial"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskMaterial_taskId_materialId_key" ON "TaskMaterial"("taskId", "materialId");

-- CreateIndex
CREATE INDEX "Task_recipeId_idx" ON "Task"("recipeId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMaterial" ADD CONSTRAINT "TaskMaterial_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMaterial" ADD CONSTRAINT "TaskMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
