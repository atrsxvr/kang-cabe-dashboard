import { expect, test, type Page } from "@playwright/test";

import { chooseNewBuyer } from "./buyer";

/**
 * Closing a season goes through its checklist.
 *
 * A season of its own, left with two loose ends on purpose — half the crop
 * unsold and the sale that took the other half unpaid — so the checklist has
 * something real to say, and closing anyway is the path exercised.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Tutup ${stamp}`;
let seasonId = "";

const seasonCard = (page: Page) =>
  page.locator('[data-slot="card"]').filter({ hasText: SEASON });

test.describe.serial("tutup musim", () => {
  test("menyiapkan musim dengan panen yang belum habis terjual", async ({
    page,
  }) => {
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
    await page.getByLabel("Bagus (kg)", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Simpan Panen" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Catat Penjualan" }).click();
    await page.getByLabel("Tanggal Jual", { exact: true }).fill("2026-06-02");
    await chooseNewBuyer(page, `E2E Pembeli ${stamp}`);
    await page.getByLabel("Bobot Bagus").fill("5");
    await page.getByLabel("Harga Bagus per kg").fill("30000");
    await page.getByRole("button", { name: "Simpan Penjualan" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("Edit musim tidak menawarkan status, jadi tidak ada jalan pintas ke Selesai", async ({
    page,
  }) => {
    await page.goto("/seasons");
    await seasonCard(page)
      .getByRole("button", { name: `Edit ${SEASON}` })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Nama Musim", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Status", { exact: true })).toHaveCount(0);
  });

  test("musim yang belum beres tidak bisa ditutup", async ({ page }) => {
    await page.goto("/seasons");
    const card = seasonCard(page);

    // Perencanaan → Berjalan → Panen are single taps, as before.
    await card.getByRole("button", { name: "Berjalan" }).click();
    await expect(card.getByText("Berjalan").first()).toBeVisible();
    await card.getByRole("button", { name: "Panen" }).click();

    // The last step is not.
    await card.getByRole("button", { name: "Tutup Musim" }).click();
    const dialog = page.getByRole("dialog");
    const list = dialog.getByRole("list", { name: "Daftar periksa tutup musim" });
    await expect(list).toBeVisible();

    await expect(list).toContainText("1 penjualan belum lunas (Rp 150.000)");
    await expect(list).toContainText("5 kg cabai Bagus belum terjual");
    await expect(list).toContainText("Semua pemakaian bahan sudah dicatat");
    // Each loose end says where it is settled.
    await expect(
      list.getByRole("link", { name: "Ke Panen & Penjualan" }).first()
    ).toHaveAttribute("href", `/harvest?season=${seasonId}`);

    // Every item has to be settled first — no way to close anyway.
    await expect(dialog).toContainText(/Bereskan dulu \d+ hal di atas/);
    await expect(
      dialog.getByRole("button", { name: "Tutup Musim", exact: true })
    ).toBeDisabled();
    await expect(dialog.getByRole("button", { name: /walaupun/ })).toHaveCount(0);

    // Still open for business after the dialog is dismissed.
    await page.keyboard.press("Escape");
    await expect(card.getByRole("button", { name: "Tutup Musim" })).toBeVisible();
  });

  test("musim baru tidak bisa langsung dibuat Selesai", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();

    const status = page.getByRole("dialog").getByLabel("Status", { exact: true });
    await expect(status.locator("option", { hasText: "Perencanaan" })).toHaveCount(1);
    await expect(status.locator("option", { hasText: "Selesai" })).toHaveCount(0);
  });
});
