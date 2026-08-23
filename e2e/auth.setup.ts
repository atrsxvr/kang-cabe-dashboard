import { execFileSync } from "node:child_process";

import { test as setup } from "@playwright/test";

/** Berkas tempat sesi Admin disimpan, dipakai seluruh spec. */
export const ADMIN_STATE = "e2e/.auth/admin.json";

/**
 * Dijalankan sekali sebelum spec mana pun.
 *
 * Sesinya Admin karena hampir seluruh suite ini menguji alur kerja, bukan
 * penolakan — dan Admin bisa menulis di mana saja. Penolakan per peran diuji
 * terpisah dengan sesi yang dibuat khusus di specnya sendiri.
 */
setup("masuk sebagai Admin", async ({ browser }) => {
  const raw = execFileSync(
    "pnpm",
    ["exec", "tsx", "e2e/make-session.ts", "ADMIN"],
    { encoding: "utf8" }
  );

  const cookie = JSON.parse(raw.trim().split("\n").pop() ?? "") as {
    name: string;
    value: string;
  };

  const context = await browser.newContext();
  await context.addCookies([
    {
      ...cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await context.storageState({ path: ADMIN_STATE });
  await context.close();
});
