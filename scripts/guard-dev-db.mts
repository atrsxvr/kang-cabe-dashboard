/**
 * Menahan perintah yang menulis besar-besaran supaya tidak kena basis data
 * produksi.
 *
 * Selama pengembangan `.env` menunjuk basis data yang sama dengan yang dipakai
 * aplikasi live, dan itu aman selama isinya data karangan. Begitu Musim 2 jalan
 * ia berhenti aman: `prisma migrate dev` boleh **me-reset** basis data kalau
 * mendeteksi drift, `db:seed` menyuntik empat anggota palsu ke daftar yang sudah
 * berisi Gmail sungguhan, dan `playwright test` menulis puluhan baris.
 *
 * Ketiganya gagal tanpa suara ke arah yang benar — perintahnya sukses, dan yang
 * hilang baru ketahuan saat seseorang mencari panen minggu lalu.
 *
 * Produksi dikenali dari `PROD_DB_REF` di `.env`. Sengaja dari sana, bukan
 * ditulis di berkas yang terlacak: repo ini publik.
 *
 * Tanpa `PROD_DB_REF`, atau terhadap basis data yang bukan pooler Supabase
 * (Postgres lokal, kontainer sekali pakai di CI), penjaga ini diam saja — tidak
 * ada yang perlu dilindungi di situ.
 */
import "dotenv/config";

import { projectRefOf } from "../src/lib/db-ref.js";

const label = process.argv[2] ?? "perintah ini";

const production = process.env.PROD_DB_REF?.trim();
const target = projectRefOf(process.env.DATABASE_URL);

if (production && target && production === target) {
  if (process.env.ALLOW_PROD_DB === "1") {
    console.warn(
      `\n⚠️  ${label} dijalankan ke basis data PRODUKSI (${target}).\n` +
        `   Diizinkan karena ALLOW_PROD_DB=1.\n`
    );
  } else {
    console.error(
      `\n⛔ Ditahan: ${label} mengarah ke basis data PRODUKSI (${target}).\n\n` +
        `   DATABASE_URL di .env masih menunjuk proyek yang dipakai aplikasi live.\n` +
        `   Arahkan ke proyek Supabase pengembangan dulu.\n\n` +
        `   Kalau memang disengaja: ALLOW_PROD_DB=1 pnpm ...\n`
    );
    process.exit(1);
  }
}
