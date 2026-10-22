import { execFileSync } from "node:child_process";

import { expect, test } from "@playwright/test";

/**
 * Buku kas dikirim lima puluh baris sekaligus. Tanpa batas, setiap rupiah
 * sejak musim pertama ikut terkirim ke HP setiap kali Keuangan dibuka.
 */
test("buku kas lima puluh sekaligus, sisanya saat diminta atau disaring", async ({
  page,
}) => {
  execFileSync("pnpm", ["exec", "tsx", "e2e/seed-ledger.mts"], { stdio: "inherit" });

  await page.goto("/finance");
  await page.getByRole("tab", { name: "Kas" }).click();

  const rows = page.locator("ul.divide-y > li");
  await expect(rows).toHaveCount(50);

  await page.getByRole("button", { name: /Muat lebih banyak/ }).click();
  await expect(rows).toHaveCount(100);

  // February 2020 in the seeded months: 29 days, so 29 entries.
  await page.getByLabel("Saring bulan").selectOption("2020-02");
  await expect(rows).toHaveCount(29);
  await expect(page.getByText("29 dari 29 catatan")).toBeVisible();
  await expect(page.getByRole("button", { name: /Muat lebih banyak/ })).toHaveCount(0);
});
