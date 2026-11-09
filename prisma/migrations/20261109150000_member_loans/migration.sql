-- Pinjaman anggota: uang kas yang dipinjam untuk keperluan pribadi, dan
-- pengembaliannya — tunai, atau dipotong dari bagi hasil. Sisa pinjaman
-- dihitung dari tabel ini, tidak disimpan.

CREATE TYPE "LoanEntryType" AS ENUM ('LENT', 'REPAID');

CREATE TABLE "MemberLoan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LoanEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberLoan_pkey" PRIMARY KEY ("id")
);

-- Supabase mengekspos schema public lewat PostgREST, dan Postgres tidak
-- menyalakan RLS sendiri.
ALTER TABLE "MemberLoan" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX "MemberLoan_payoutId_key" ON "MemberLoan"("payoutId");
CREATE INDEX "MemberLoan_userId_idx" ON "MemberLoan"("userId");
CREATE INDEX "MemberLoan_date_idx" ON "MemberLoan"("date");

ALTER TABLE "MemberLoan" ADD CONSTRAINT "MemberLoan_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MemberLoan" ADD CONSTRAINT "MemberLoan_payoutId_fkey"
    FOREIGN KEY ("payoutId") REFERENCES "MemberPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
