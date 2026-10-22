-- Akses tulis per peran yang diubah Admin dari menu Akses Peran. Kosong
-- berarti aturan bawaan di kode yang berlaku.
--
-- BEGIN/COMMIT ditulis sendiri: Prisma menjalankan pernyataan satu per satu.

BEGIN;

-- CreateTable
CREATE TABLE "RoleAccess" (
    "role" "Role" NOT NULL,
    "area" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleAccess_pkey" PRIMARY KEY ("role","area")
);

-- Supabase mengekspos schema public lewat PostgREST, dan Postgres tidak
-- menyalakan RLS sendiri. Siapa boleh menulis apa tidak boleh bisa diubah
-- dari luar aplikasi.
ALTER TABLE "RoleAccess" ENABLE ROW LEVEL SECURITY;

COMMIT;
