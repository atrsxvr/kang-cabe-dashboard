import { expect, test, type Page } from "@playwright/test";

/**
 * Pinjaman anggota: kas berkurang saat dipinjam, bertambah saat dikembalikan,
 * dan sisanya dipotong dari bagi hasil — kas hanya berkurang sebesar yang
 * benar-benar diserahkan.
 *
 * Yang dicek selisih saldo, bukan saldo mutlak: basis datanya dipakai bersama.
 */

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const SEASON = `E2E Musim Pinjam ${stamp}`;

function rupiahOf(text: string): number {
  const digits = Number(text.replace(/[^0-9]/g, ""));
  return /[-−]/.test(text) ? -digits : digits;
}

async function balance(page: Page): Promise<number> {
  await page.goto("/finance");
  await page.getByRole("tab", { name: "Kas" }).click();
  const figure = page
    .getByText("Saldo kas sekarang", { exact: true })
    .locator("xpath=following-sibling::p[1]");
  return rupiahOf(await figure.innerText());
}

test("pinjam, kembali sebagian, sisanya dipotong dari bagi hasil", async ({ page }) => {
  // Four trips to Keuangan to read the balance, each a full page load.
  test.setTimeout(90_000);
  await page.goto("/seasons");
  await page.getByRole("button", { name: "Tambah Musim" }).click();
  await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
  await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
  await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
  await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Simpan Musim" }).click();
  await expect(page).toHaveURL(/season=/);

  const start = await balance(page);

  // Pinjam Rp 300.000.
  await page.getByRole("button", { name: "Catat Pinjaman" }).click();
  const lend = page.getByRole("dialog");
  const member = await lend.getByLabel("Anggota").locator("option").first().innerText();
  await lend.getByLabel("Jumlah (Rp)").fill("300000");
  await lend.getByLabel("Catatan (opsional)").fill(`E2E pinjam ${stamp}`);
  await lend.getByRole("button", { name: "Simpan" }).click();
  await expect(lend).toBeHidden();
  await expect.poll(() => balance(page)).toBe(start - 300_000);

  // Kembali Rp 100.000 tunai.
  await page.getByRole("button", { name: "Catat Pengembalian" }).click();
  const repay = page.getByRole("dialog");
  // Only members who still owe are offered, with what they owe beside them.
  await expect(repay.getByLabel("Anggota")).toContainText(`${member} — sisa Rp 300.000`);
  await repay.getByLabel("Jumlah (Rp)").fill("100000");
  await repay.getByLabel("Catatan (opsional)").fill(`E2E kembali ${stamp}`);
  await repay.getByRole("button", { name: "Simpan" }).click();
  await expect(repay).toBeHidden();
  await expect.poll(() => balance(page)).toBe(start - 200_000);

  // Bagi hasil Rp 500.000: sisa Rp 200.000 dipotong, Rp 300.000 diserahkan.
  await page.getByRole("button", { name: "Bayar ke Anggota" }).click();
  const pay = page.getByRole("dialog");
  await pay.getByLabel("Jenis").selectOption("PROFIT_SHARE");
  await pay.getByLabel("Anggota").selectOption({ label: member });
  await pay.getByLabel("Jumlah (Rp)").fill("500000");
  await pay.getByLabel("Bagi hasil musim").selectOption({ label: SEASON });
  await expect(pay).toContainText("Dipotong Rp 200.000");
  await expect(pay).toContainText("pinjaman lunas");
  await pay.getByLabel("Catatan (opsional)").fill(`E2E bagi ${stamp}`);
  await pay.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(pay).toBeHidden();

  await expect.poll(() => balance(page)).toBe(start - 500_000);
  // toContainText, not a regex: "Rp" and the figure are joined by a
  // non-breaking space, which a typed space never matches.
  const row = page.locator('[data-slot="card"]').filter({ hasText: `E2E bagi ${stamp}` });
  await expect(row).toContainText("Dipotong pinjaman Rp 200.000");
});
