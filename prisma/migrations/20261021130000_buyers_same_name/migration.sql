-- Satukan pembeli yang namanya cuma beda huruf besar-kecil atau spasi.
--
-- Migrasi sebelumnya membuat satu pembeli per ejaan persis, jadi "Pak Ujang"
-- dan "pak ujang" jadi dua orang — padahal aplikasi menganggap keduanya orang
-- yang sama dan menolak membuat yang kedua (`sameBuyerName`). Kuncinya sama
-- dengan aturan itu: dipangkas, spasi berurutan jadi satu, huruf kecil semua.
--
-- Beda ejaan ("Pak Ujang" dan "Pak Ujan") tidak disentuh: itu bisa dua orang,
-- dan yang tahu adalah yang menjualnya — lewat tombol Gabungkan.
--
-- Yang dipertahankan dari tiap kelompok: yang datanya sudah lengkap, lalu yang
-- paling banyak penjualannya (ejaan yang paling sering dipakai), lalu yang
-- paling dulu dibuat.
--
-- BEGIN/COMMIT ditulis sendiri: Prisma menjalankan pernyataan satu per satu
-- tanpa membungkusnya, dan pindah-penjualan tanpa hapus-duplikat (atau
-- sebaliknya) tidak boleh tertinggal setengah jalan.

BEGIN;

UPDATE "SaleTransaction" AS sale
SET "buyerId" = ranked."keeperId"
FROM (
  SELECT
    b."id",
    first_value(b."id") OVER (
      PARTITION BY lower(regexp_replace(btrim(b."name"), '\s+', ' ', 'g'))
      ORDER BY
        (b."location" IS NOT NULL AND b."kind" IS NOT NULL) DESC,
        (SELECT count(*) FROM "SaleTransaction" s WHERE s."buyerId" = b."id") DESC,
        b."createdAt" ASC,
        b."id" ASC
    ) AS "keeperId"
  FROM "Buyer" b
) AS ranked
WHERE sale."buyerId" = ranked."id" AND ranked."id" <> ranked."keeperId";

-- Setelah penjualannya pindah, duplikat tidak punya penjualan lagi; yang
-- dipertahankan justru bertambah, jadi urutannya tidak berubah.
DELETE FROM "Buyer" AS buyer
USING (
  SELECT
    b."id",
    first_value(b."id") OVER (
      PARTITION BY lower(regexp_replace(btrim(b."name"), '\s+', ' ', 'g'))
      ORDER BY
        (b."location" IS NOT NULL AND b."kind" IS NOT NULL) DESC,
        (SELECT count(*) FROM "SaleTransaction" s WHERE s."buyerId" = b."id") DESC,
        b."createdAt" ASC,
        b."id" ASC
    ) AS "keeperId"
  FROM "Buyer" b
) AS ranked
WHERE buyer."id" = ranked."id" AND ranked."id" <> ranked."keeperId";

COMMIT;
