-- CreateEnum
CREATE TYPE "PayoutType" AS ENUM ('PROFIT_SHARE', 'CAPITAL_RETURN');

-- CreateTable
CREATE TABLE "MemberPayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PayoutType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT,
    "note" TEXT,
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberPayout_userId_idx" ON "MemberPayout"("userId");

-- CreateIndex
CREATE INDEX "MemberPayout_paidAt_idx" ON "MemberPayout"("paidAt");

-- CreateIndex
CREATE INDEX "MemberPayout_seasonId_idx" ON "MemberPayout"("seasonId");

-- AddForeignKey
ALTER TABLE "MemberPayout" ADD CONSTRAINT "MemberPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPayout" ADD CONSTRAINT "MemberPayout_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase mengekspos schema public lewat PostgREST, dan Postgres tidak
-- menyalakan RLS sendiri. Tanpa policy, anon dan authenticated tidak bisa
-- membaca apa pun; aplikasi masuk sebagai pemilik tabel dan tidak terpengaruh.
ALTER TABLE "MemberPayout" ENABLE ROW LEVEL SECURITY;
