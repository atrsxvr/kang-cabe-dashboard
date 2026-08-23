-- Anggota yang diundang Admin dianggap terverifikasi.
--
-- better-auth menolak menautkan identitas Google ke baris yang belum
-- terverifikasi, supaya penyerang tidak bisa mendaftarkan email korban lebih
-- dulu lalu menunggu identitas korban tertaut ke barisnya. Ancaman itu
-- mengandaikan orang bisa mendaftar sendiri; di sini pendaftaran dimatikan dan
-- tiap baris dibuat Admin sebagai undangan, jadi tindakan Admin mengetik
-- alamatnya itulah verifikasinya.
--
-- Tanpa ini, masuk pertama kali gagal dengan `account_not_linked` dan pesannya
-- tidak menyebut sebabnya.
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT true;

-- Empat baris yang sudah ada dibuat sebelum kolomnya punya default ini.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;
