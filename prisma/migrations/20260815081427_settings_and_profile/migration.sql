-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profitShare" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GardenProfile" (
    "id" TEXT NOT NULL DEFAULT 'garden',
    "name" TEXT NOT NULL DEFAULT 'Kebun Kang Cabe',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationName" TEXT,
    "defaultTankLitres" DOUBLE PRECISION NOT NULL DEFAULT 45,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GardenProfile_pkey" PRIMARY KEY ("id")
);
