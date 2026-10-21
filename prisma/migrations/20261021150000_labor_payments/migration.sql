-- Upah borongan: pekerjaan, penerima, dan tugas yang dibayar.
--
-- Semua kolom boleh kosong — hanya catatan kategori Upah yang mengisinya, dan
-- catatan lama tidak punya isinya. Tidak ada data yang dipindah.
--
-- BEGIN/COMMIT ditulis sendiri: Prisma menjalankan pernyataan satu per satu.

BEGIN;

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "laborJob" TEXT,
ADD COLUMN     "payee" TEXT,
ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "FinanceTransaction_taskId_idx" ON "FinanceTransaction"("taskId");

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
