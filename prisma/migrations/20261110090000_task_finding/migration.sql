-- Tugas penanganan ditautkan ke temuan asalnya, supaya temuan ikut menjadi
-- "Sudah ditangani" saat tugasnya selesai. Kolom baru boleh kosong: tugas
-- lama dan tugas biasa tidak berasal dari temuan mana pun.

ALTER TABLE "Task" ADD COLUMN "findingId" TEXT;

CREATE INDEX "Task_findingId_idx" ON "Task"("findingId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_findingId_fkey"
    FOREIGN KEY ("findingId") REFERENCES "HealthLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
