-- Lahan kebun: profil kebun yang dulu satu untuk seluruh aplikasi kini satu
-- per lahan, dan setiap musim memilih lahannya. Ditambah volume tangki spray
-- dan kocor per musim.
--
-- Profil yang ada dipindah menjadi lahan pertama, dan semua musim yang sudah
-- ada ditautkan ke sana — tidak ada musim tanpa lahan. GardenProfile tidak
-- dihapus di sini: kode lama yang masih live selama jeda sebelum deploy
-- membacanya.
--
-- BEGIN/COMMIT ditulis sendiri: Prisma menjalankan pernyataan satu per satu.

BEGIN;

CREATE TABLE "Garden" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "bmkgAdm4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garden_pkey" PRIMARY KEY ("id")
);

-- Supabase mengekspos schema public lewat PostgREST, dan Postgres tidak
-- menyalakan RLS sendiri.
ALTER TABLE "Garden" ENABLE ROW LEVEL SECURITY;

-- Lahan pertama dari profil yang ada; kalau profilnya belum pernah dibuat,
-- dengan nama bawaannya.
INSERT INTO "Garden" ("id", "name", "locationName", "latitude", "longitude", "bmkgAdm4", "updatedAt")
SELECT gen_random_uuid()::text,
       COALESCE((SELECT "name" FROM "GardenProfile" LIMIT 1), 'Kebun Kang Cabe'),
       (SELECT "locationName" FROM "GardenProfile" LIMIT 1),
       (SELECT "latitude" FROM "GardenProfile" LIMIT 1),
       (SELECT "longitude" FROM "GardenProfile" LIMIT 1),
       (SELECT "bmkgAdm4" FROM "GardenProfile" LIMIT 1),
       CURRENT_TIMESTAMP;

ALTER TABLE "Season"
    ADD COLUMN "gardenId" TEXT,
    ADD COLUMN "kocorTankLitres" DOUBLE PRECISION NOT NULL DEFAULT 20,
    ADD COLUMN "sprayTankLitres" DOUBLE PRECISION NOT NULL DEFAULT 16;

UPDATE "Season" SET "gardenId" = (SELECT "id" FROM "Garden" LIMIT 1);

ALTER TABLE "Season" ALTER COLUMN "gardenId" SET NOT NULL;

ALTER TABLE "Season" ADD CONSTRAINT "Season_gardenId_fkey"
    FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Season_gardenId_idx" ON "Season"("gardenId");

COMMIT;
