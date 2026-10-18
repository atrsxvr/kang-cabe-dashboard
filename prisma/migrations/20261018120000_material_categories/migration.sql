-- Enam kategori baru, disisipkan di dekat kerabatnya alih-alih di ujung:
-- Postgres mengurutkan enum menurut urutan deklarasinya, dan daftar gudang
-- diurutkan per kategori. Ditaruh di ujung, Insektisida akan muncul sesudah
-- "Lainnya", jauh dari Pestisida.
ALTER TYPE "MaterialCategory" ADD VALUE 'BOOSTER' AFTER 'FERTILIZER';
ALTER TYPE "MaterialCategory" ADD VALUE 'AMELIORANT' AFTER 'BOOSTER';
ALTER TYPE "MaterialCategory" ADD VALUE 'BIOLOGICAL' AFTER 'AMELIORANT';
ALTER TYPE "MaterialCategory" ADD VALUE 'INSECTICIDE' AFTER 'PESTICIDE';
ALTER TYPE "MaterialCategory" ADD VALUE 'ACARICIDE' AFTER 'INSECTICIDE';
ALTER TYPE "MaterialCategory" ADD VALUE 'ADHESIVE' AFTER 'GROWTH_REGULATOR';
