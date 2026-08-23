-- CreateEnum
CREATE TYPE "GrowthPhase" AS ENUM ('VEGETATIVE', 'GENERATIVE', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "RecipeKind" AS ENUM ('ROUTINE', 'TREATMENT');

-- CreateEnum
CREATE TYPE "ApplicationMethod" AS ENUM ('KOCOR', 'SEMPROT');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('FERTILIZER', 'PESTICIDE', 'FUNGICIDE', 'GROWTH_REGULATOR', 'OTHER');

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL DEFAULT 'FERTILIZER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "RecipeKind" NOT NULL DEFAULT 'ROUTINE',
    "method" "ApplicationMethod" NOT NULL DEFAULT 'SEMPROT',
    "phase" "GrowthPhase",
    "targetIssue" TEXT,
    "intervalDays" INTEGER,
    "basisVolumeL" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "preHarvestIntervalDays" INTEGER,
    "notes" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "amountPerLiter" DOUBLE PRECISION NOT NULL,
    "note" TEXT,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_name_key" ON "Material"("name");

-- CreateIndex
CREATE INDEX "Material_category_idx" ON "Material"("category");

-- CreateIndex
CREATE INDEX "Recipe_kind_phase_idx" ON "Recipe"("kind", "phase");

-- CreateIndex
CREATE INDEX "Recipe_authorId_idx" ON "Recipe"("authorId");

-- CreateIndex
CREATE INDEX "RecipeItem_materialId_idx" ON "RecipeItem"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_recipeId_materialId_key" ON "RecipeItem"("recipeId", "materialId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
