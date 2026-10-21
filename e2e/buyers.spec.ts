import { expect, test, type Page } from "@playwright/test";

import { chooseNewBuyer } from "./buyer";

/**
 * Buyers as a list: added from the sale form, picked again next time,
 * refused when typed twice, merged when they were — and each with a page
 * holding what they have paid.
 *
 * A season of its own, so its sales and buyers go with the teardown.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Pembeli ${stamp}`;
const REGULAR = `E2E Pak Langganan ${stamp}`;
const DUPLICATE = `E2E Pak Dobel ${stamp}`;
let seasonId = "";

async function openSale(page: Page) {
  await page.goto(`/harvest?season=${seasonId}`);
  await page.getByRole("button", { name: "Catat Penjualan" }).click();
  return page.getByRole("dialog");
}

async function sell(page: Page, kg: string, price: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Bobot Bagus").fill(kg);
  await dialog.getByLabel("Harga Bagus per kg").fill(price);
  await dialog.getByRole("button", { name: "Simpan Penjualan" }).click();
  await expect(dialog).toHaveCount(0);
}

async function openBuyersTab(page: Page) {
  await page.goto(`/harvest?season=${seasonId}`);
  await page.getByRole("tab", { name: /Pembeli/ }).click();
}

test.describe.serial("daftar pembeli", () => {
  test("menyiapkan musim dengan panen", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();
    await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
    await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
    await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
    await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
    await page.getByRole("button", { name: "Simpan Musim" }).click();
    await expect(page).toHaveURL(/season=/);
    seasonId = new URL(page.url()).searchParams.get("season") ?? "";

    await page.goto(`/harvest?season=${seasonId}`);
    await page.getByRole("button", { name: "Catat Panen" }).click();
    await page.getByLabel("Tanggal Panen", { exact: true }).fill("2026-06-01");
    await page.getByLabel("Bagus (kg)", { exact: true }).fill("50");
    await page.getByRole("button", { name: "Simpan Panen" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("pembeli baru dicatat langsung dari form penjualan", async ({ page }) => {
    const dialog = await openSale(page);
    await dialog.getByLabel("Tanggal Jual", { exact: true }).fill("2026-06-02");
    await chooseNewBuyer(dialog, REGULAR, {
      location: "E2E Pasar Induk",
      kind: "PASAR",
      whatsapp: "0812-3456-7890",
    });
    await sell(page, "10", "30000");

    await openBuyersTab(page);
    const card = page.getByRole("link").filter({ hasText: REGULAR });
    await expect(card).toContainText("Pasar");
    await expect(card).toContainText("E2E Pasar Induk");
    await expect(card).toContainText("1× beli");
  });

  test("lain kali dipilih dari daftar, bukan diketik ulang", async ({ page }) => {
    const dialog = await openSale(page);
    await dialog.getByLabel("Tanggal Jual", { exact: true }).fill("2026-06-09");
    await dialog
      .getByLabel("Pembeli", { exact: true })
      .selectOption({ label: `${REGULAR} · Pasar` });
    await sell(page, "10", "20000");

    // Two sales, one buyer: (10 × 30.000 + 10 × 20.000) ÷ 20 kg.
    await openBuyersTab(page);
    await page.getByRole("link").filter({ hasText: REGULAR }).click();
    await expect(page.getByRole("heading", { name: REGULAR })).toBeVisible();
    await expect(page.getByText("2×", { exact: true })).toBeVisible();
    await expect(page.getByText("Rp 25.000/kg").first()).toBeVisible();

    // Price history, newest first, with the season it belongs to.
    const history = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Riwayat harga" }),
    });
    await expect(history.getByText("Rp 20.000/kg")).toBeVisible();
    await expect(history.getByText("Rp 30.000/kg")).toBeVisible();
    await expect(history.getByRole("link", { name: SEASON }).first()).toBeVisible();

    // The number as typed, dialled the way wa.me wants it.
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/6281234567890"
    );
  });

  test("nama yang sudah ada ditolak, apa pun huruf besarnya", async ({ page }) => {
    const dialog = await openSale(page);
    await chooseNewBuyer(dialog, REGULAR.toUpperCase());
    await dialog.getByLabel("Bobot Bagus").fill("1");
    await dialog.getByLabel("Harga Bagus per kg").fill("10000");
    await dialog.getByRole("button", { name: "Simpan Penjualan" }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Sudah ada di daftar")).toBeVisible();
  });

  test("pembeli yang tercatat dua kali digabung jadi satu", async ({ page }) => {
    // The same person, entered twice before anyone noticed.
    const dialog = await openSale(page);
    await dialog.getByLabel("Tanggal Jual", { exact: true }).fill("2026-06-10");
    await chooseNewBuyer(dialog, DUPLICATE);
    await sell(page, "5", "26000");

    await openBuyersTab(page);
    await page.getByRole("link").filter({ hasText: DUPLICATE }).click();
    await page.getByRole("button", { name: "Gabungkan" }).click();
    const merge = page.getByRole("dialog");
    await merge
      .getByLabel("Gabungkan ke")
      .selectOption({ label: `${REGULAR} · Pasar · E2E Pasar Induk` });
    await expect(merge).toContainText("1 penjualan");
    await merge.getByRole("button", { name: "Gabungkan", exact: true }).click();

    // Lands on the buyer that stayed, now holding all three sales.
    await expect(page.getByRole("heading", { name: REGULAR })).toBeVisible();
    await expect(page.getByText("3×", { exact: true })).toBeVisible();

    await openBuyersTab(page);
    await expect(page.getByRole("link").filter({ hasText: DUPLICATE })).toHaveCount(0);
  });

  test("pembeli dengan penjualan tidak bisa dihapus, hanya digabung", async ({ page }) => {
    await openBuyersTab(page);
    await page.getByRole("link").filter({ hasText: REGULAR }).click();
    await expect(page.getByRole("heading", { name: REGULAR })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hapus" })).toHaveCount(0);
  });
});
