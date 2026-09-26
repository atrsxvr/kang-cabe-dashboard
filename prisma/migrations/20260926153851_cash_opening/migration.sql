-- CreateTable
CREATE TABLE "CashOpening" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashOpening_countedAt_idx" ON "CashOpening"("countedAt");

-- Supabase mengekspos schema public lewat PostgREST, dan Postgres tidak
-- menyalakan RLS sendiri. Tanpa policy, anon dan authenticated tidak bisa
-- membaca apa pun; aplikasi masuk sebagai pemilik tabel dan tidak terpengaruh.
ALTER TABLE "CashOpening" ENABLE ROW LEVEL SECURITY;
