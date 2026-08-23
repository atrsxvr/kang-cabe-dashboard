import { defineConfig, devices } from "@playwright/test";

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
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // The dashboard is built for a phone in a garden, so that is what it is
    // checked on.
    ...devices["Pixel 7"],
  },

  webServer: {
    // Production build, not `next dev`: dev-only behaviour (looser caching,
    // no prerender pass) would hide exactly the class of bug this suite is
    // meant to catch.
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
