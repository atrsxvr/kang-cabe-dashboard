-- CreateEnum
CREATE TYPE "ToolEventType" AS ENUM ('ACQUIRED', 'LOST', 'RETIRED', 'DAMAGED', 'SERVICED');

-- CreateTable
CREATE TABLE "ToolEvent" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "type" "ToolEventType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingNote" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolEvent_toolId_createdAt_idx" ON "ToolEvent"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolEvent_actorId_idx" ON "ToolEvent"("actorId");

-- CreateIndex
CREATE INDEX "ShoppingNote_done_createdAt_idx" ON "ShoppingNote"("done", "createdAt");

-- CreateIndex
CREATE INDEX "ShoppingNote_actorId_idx" ON "ShoppingNote"("actorId");

-- AddForeignKey
ALTER TABLE "ToolEvent" ADD CONSTRAINT "ToolEvent_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolEvent" ADD CONSTRAINT "ToolEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingNote" ADD CONSTRAINT "ShoppingNote_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
