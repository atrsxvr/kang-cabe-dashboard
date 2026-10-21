-- Pembeli jadi tabel sendiri. Dulu namanya diketik bebas di tiap penjualan,
-- jadi "Pak Ujang" dan "pak ujang" terhitung dua orang dan riwayatnya tidak
-- bisa dijumlah.
--
-- BEGIN/COMMIT ditulis sendiri: Prisma menjalankan pernyataan satu per satu
-- tanpa membungkusnya. Tanpa ini, kegagalan di tengah meninggalkan tabel
-- pembeli terisi sementara penjualan belum tersambung.

BEGIN;

-- CreateEnum
CREATE TYPE "BuyerKind" AS ENUM ('PENGEPUL', 'PASAR', 'KONSUMEN');

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "kind" "BuyerKind",
    "whatsapp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Buyer_name_idx" ON "Buyer"("name");

-- Supabase mengekspos schema public lewat PostgREST, dan Postgres tidak
-- menyalakan RLS sendiri.
ALTER TABLE "Buyer" ENABLE ROW LEVEL SECURITY;

-- Satu pembeli per nama yang pernah diketik, persis seperti ditulis (hanya
-- spasi di ujung yang dibuang). Lokasi dan jenisnya belum diketahui, jadi
-- dibiarkan kosong — aplikasi menandainya "lengkapi data". Nama yang mirip
-- digabung lewat aplikasi, oleh orang yang tahu mana yang sama; menebaknya di
-- sini bisa menyatukan dua orang berbeda.
INSERT INTO "Buyer" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, names."name", MIN(names."createdAt"), CURRENT_TIMESTAMP
FROM (
    SELECT btrim("buyerName") AS "name", "createdAt" FROM "SaleTransaction"
) AS names
GROUP BY names."name";

-- AlterTable: sambungkan tiap penjualan ke pembelinya, baru wajibkan.
ALTER TABLE "SaleTransaction" ADD COLUMN "buyerId" TEXT;

UPDATE "SaleTransaction" AS sale
SET "buyerId" = buyer."id"
FROM "Buyer" AS buyer
WHERE buyer."name" = btrim(sale."buyerName");

ALTER TABLE "SaleTransaction" ALTER COLUMN "buyerId" SET NOT NULL;

-- Nama lama dibuang setelah semuanya tersambung: dua tempat untuk satu nama
-- adalah dua sumber untuk satu fakta.
DROP INDEX "SaleTransaction_buyerName_idx";
ALTER TABLE "SaleTransaction" DROP COLUMN "buyerName";

CREATE INDEX "SaleTransaction_buyerId_idx" ON "SaleTransaction"("buyerId");

ALTER TABLE "SaleTransaction" ADD CONSTRAINT "SaleTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
