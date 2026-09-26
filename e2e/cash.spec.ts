import { expect, test, type Page } from "@playwright/test";

/**
 * Kas dihitung dari catatan di tempat lain, jadi yang perlu dibuktikan bukan
 * rumusnya — itu sudah diuji `src/lib/cash.test.ts` — melainkan bahwa setoran
 * yang diketik di tab Modal dan bagi hasil yang diketik di tab Kas benar-benar
 * sampai ke angka yang sama.
 *
 * Yang diperiksa **selisihnya**, bukan saldo mutlak. Basis datanya dipakai
 * bersama spec lain yang juga belanja dan menjual, dan saldo mutlak akan
 * bergantung pada urutan spec dijalankan.
 */

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const seasonName = `E2E Musim Kas ${stamp}`;

function rupiahOf(text: string): number {
  const digits = Number(text.replace(/[^0-9]/g, ""));
  return /[-−]/.test(text) ? -digits : digits;
}

async function balance(page: Page): Promise<number> {
  const figure = page
    .getByText("Saldo kas sekarang", { exact: true })
    .locator("xpath=following-sibling::p[1]");
  return rupiahOf(await figure.innerText());
}

async function openFinance(page: Page, tab: "Kas" | "Modal") {
  await page.goto("/finance");
  await page.getByRole("tab", { name: tab }).click();
}

test("setoran menambah kas, bagi hasil menguranginya", async ({ page }) => {
  // Halaman Keuangan butuh musim, dan bagi hasil wajib menyebut musimnya.
  await page.goto("/seasons");
  await page.getByRole("button", { name: "Tambah Musim" }).click();
  await page.getByLabel("Nama Musim", { exact: true }).fill(seasonName);
  await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
  await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
  await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Simpan Musim" }).click();
  await expect(page).toHaveURL(/season=/);

  await openFinance(page, "Kas");
  const before = await balance(page);

  await page.getByRole("tab", { name: "Modal" }).click();
  await page.getByRole("button", { name: "Catat Setoran" }).click();
  const setor = page.getByRole("dialog");
  await setor.getByLabel("Jumlah (Rp)").fill("1000000");
  await setor.getByLabel("Catatan (opsional)").fill(`E2E setoran ${stamp}`);
  await setor.getByRole("button", { name: "Simpan Setoran" }).click();
  await expect(setor).toBeHidden();

  await page.getByRole("tab", { name: "Kas" }).click();
  await expect.poll(() => balance(page)).toBe(before + 1_000_000);

  await page.getByRole("button", { name: "Catat Uang Keluar" }).click();
  const keluar = page.getByRole("dialog");
  await keluar.getByLabel("Jenis").selectOption("PROFIT_SHARE");
  await keluar.getByLabel("Jumlah (Rp)").fill("250000");
  await keluar.getByLabel("Bagi hasil musim").selectOption({ label: seasonName });
  await keluar.getByLabel("Catatan (opsional)").fill(`E2E bagi hasil ${stamp}`);
  await keluar.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(keluar).toBeHidden();

  await expect.poll(() => balance(page)).toBe(before + 750_000);
  await expect(page.getByText(`E2E bagi hasil ${stamp}`).first()).toBeVisible();
});

/**
 * Tanpa batas ini porsi modal bisa minus. Ditolak di server, dan pesannya
 * menyebut berapa yang masih bisa ditarik.
 */
test("tarik modal melebihi setoran ditolak", async ({ page }) => {
  await openFinance(page, "Kas");

  await page.getByRole("button", { name: "Catat Uang Keluar" }).click();
  const keluar = page.getByRole("dialog");
  await keluar.getByLabel("Jenis").selectOption("CAPITAL_RETURN");
  // Di bawah batas Rp 1 miliar milik validasi rupiah — di atasnya formulir
  // ditolak lebih dulu dengan pesan lain, dan penjaga modal tidak pernah
  // tersentuh. Versi pertama tes ini memakai 999 miliar dan menguji hal yang
  // salah.
  await keluar.getByLabel("Jumlah (Rp)").fill("900000000");
  await keluar.getByLabel("Catatan (opsional)").fill(`E2E tarik ${stamp}`);
  await keluar.getByRole("button", { name: "Simpan", exact: true }).click();

  await expect(keluar).toBeVisible();
  await expect(
    keluar.getByText(/Modal orang ini tinggal|belum punya modal yang bisa ditarik/)
  ).toBeVisible();
});

/** Satu jalan masuk untuk belanja alat: lewat Inventaris, bukan Keuangan. */
test("Keuangan tidak lagi menawarkan kategori Peralatan", async ({ page }) => {
  await page.goto("/finance");
  await page.getByRole("button", { name: "Catat Pengeluaran" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Kategori")).toBeVisible();
  await expect(
    dialog.getByLabel("Kategori").locator("option", { hasText: "Peralatan" })
  ).toHaveCount(0);
});
