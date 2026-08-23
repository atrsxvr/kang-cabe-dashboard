import { defineConfig, devices } from "@playwright/test";

/**
 * Port sendiri, bukan 3000.
 *
 * Dulu suite ini memakai ulang apa pun yang sedang mendengarkan di 3000, dan
 * itu dua kesalahan sekaligus: yang di sana biasanya `next dev`, padahal
 * `webServer` di bawah sengaja meminta build produksi — dan proses yang sudah
 * berjam-jam hidup memegang `.env` versi lama. Yang kedua nyaris membuat
 * seluruh suite menulis ke basis data produksi beberapa menit setelah
 * DATABASE_URL dipindah ke proyek pengembangan: penjaga di package.json
 * memeriksa env milik shell, sementara servernya memegang env miliknya
 * sendiri.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * These cover what the unit tests structurally cannot: a form submitting to a
 * Server Action, a season filter surviving a page change, stock actually
 * leaving the shed and turning up as a cost. Every one of those crosses the
 * browser, a Server Action and Postgres, and each of those seams has broken at
 * least once in this project.
 *
 * They run against a real database. In CI that is a throwaway Postgres service
 * container; locally it is whatever DATABASE_URL points at, so the specs clean
 * up after themselves and prefix everything they create with "E2E".
 */
export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  // Server Actions write to one shared database; parallel specs would trip
  // over each other's stock counts.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  /**
   * Satu proyek penyiapan yang membuat sesi masuk, lalu semua spec memakainya.
   *
   * Sejak otentikasi terpasang, setiap halaman mengalihkan yang belum masuk —
   * dan seluruh suite ini membuka halaman. Lihat `e2e/session.ts` untuk alasan
   * sesinya ditulis langsung ke basis data alih-alih menekan tombol Google.
   */
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: { storageState: "e2e/.auth/admin.json" },
    },
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // The dashboard is built for a phone in a garden, so that is what it is
    // checked on.
    ...devices["Pixel 7"],
  },

  webServer: {
    // Production build, not `next dev`: dev-only behaviour (looser caching,
    // no prerender pass) would hide exactly the class of bug this suite is
    // meant to catch.
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: BASE_URL,
    // Selalu bangun yang baru. Memakai ulang server yang sudah jalan berarti
    // mengujinya dengan kode dan environment sebagaimana adanya saat ia
    // dinyalakan, bukan sebagaimana adanya sekarang — dan tidak ada satu pun
    // di keluarannya yang menyebutkan itu.
    reuseExistingServer: false,
    // better-auth menyusun URL-nya dari sini. Dibiarkan menunjuk 3000, ia
    // menolak permintaan yang datang dari port ini sebagai lintas-asal.
    env: { BETTER_AUTH_URL: BASE_URL },
    timeout: 180_000,
  },
});
