-- CreateTable
CREATE TABLE "CapitalContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "proofUrl" TEXT,
    "seasonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CapitalContribution_userId_idx" ON "CapitalContribution"("userId");

-- CreateIndex
CREATE INDEX "CapitalContribution_paidAt_idx" ON "CapitalContribution"("paidAt");

-- CreateIndex
CREATE INDEX "CapitalContribution_seasonId_idx" ON "CapitalContribution"("seasonId");

-- AddForeignKey
ALTER TABLE "CapitalContribution" ADD CONSTRAINT "CapitalContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapitalContribution" ADD CONSTRAINT "CapitalContribution_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
