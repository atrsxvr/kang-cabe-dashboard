import { expect, test } from "@playwright/test";

/**
 * Lahan: each season is planted on one, and the tanks a plot uses travel
 * with its seasons — into the next season's form and into a new recipe's
 * volume acuan. A lahan of its own, named "E2E …", so the teardown takes it.
 */

const stamp = Date.now();
const GARDEN = `E2E Lahan ${stamp}`;
const SPARE = `E2E Lahan Cadangan ${stamp}`;
const SEASON = `E2E Musim Lahan ${stamp}`;
let seasonId = "";

test.describe.serial("lahan dan tangki per musim", () => {
  test("lahan baru didaftarkan di Pengaturan", async ({ page }) => {
    await page.goto("/settings");
    for (const name of [GARDEN, SPARE]) {
      await page.getByRole("button", { name: "Tambah Lahan" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Nama Lahan", { exact: true }).fill(name);
      await dialog.getByRole("button", { name: "Simpan Lahan" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
  });

  test("musim ditanam di lahan itu, dengan tangkinya sendiri", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
    await dialog.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
    await dialog.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
    await dialog.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
    await dialog.getByLabel("Lahan", { exact: true }).selectOption({ label: GARDEN });
    await dialog.getByLabel("Tangki spray (L)", { exact: true }).fill("18");
    await dialog.getByLabel("Tangki kocor (L)", { exact: true }).fill("22");
    await dialog.getByRole("button", { name: "Simpan Musim" }).click();
    await expect(page).toHaveURL(/season=/);
    seasonId = new URL(page.url()).searchParams.get("season") ?? "";

    await expect(
      page.locator('[data-slot="card"]').filter({ hasText: SEASON }).first()
    ).toContainText(GARDEN);
  });

  test("musim berikutnya di lahan yang sama mewarisi tangkinya", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Lahan", { exact: true }).selectOption({ label: SPARE });
    await expect(dialog.getByLabel("Tangki spray (L)", { exact: true })).toHaveValue("16");
    await dialog.getByLabel("Lahan", { exact: true }).selectOption({ label: GARDEN });
    await expect(dialog.getByLabel("Tangki spray (L)", { exact: true })).toHaveValue("18");
    await expect(dialog.getByLabel("Tangki kocor (L)", { exact: true })).toHaveValue("22");
  });

  test("volume acuan racikan baru mengikuti tangki musim terpilih", async ({ page }) => {
    await page.goto(`/health/racikan?season=${seasonId}`);
    const add = page.getByRole("button", { name: "Tambah Racikan" });
    test.skip(await add.isDisabled(), "Belum ada bahan yang bisa ditakar di basis data ini.");
    await add.click();

    const dialog = page.getByRole("dialog");
    const basis = dialog.getByLabel("Volume acuan (liter)", { exact: true });
    await expect(basis).toHaveValue("18");

    await dialog.getByLabel("Cara Aplikasi", { exact: true }).selectOption("KOCOR");
    await expect(basis).toHaveValue("22");

    // Typed by hand, it stays put: "masih bisa diubah".
    await basis.fill("30");
    await dialog.getByLabel("Cara Aplikasi", { exact: true }).selectOption("SEMPROT");
    await expect(basis).toHaveValue("30");
  });

  test("lahan yang belum dipakai bisa dihapus, yang sudah dipakai tidak", async ({ page }) => {
    await page.goto("/settings");
    const used = page.locator('[data-slot="card"]').filter({ hasText: GARDEN }).filter({ hasText: "1 musim" });
    await expect(used.getByRole("button", { name: /^Hapus/ })).toHaveCount(0);

    const spare = page.locator('[data-slot="card"]').filter({ hasText: SPARE });
    await spare.getByRole("button", { name: /^Hapus/ }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: /Hapus/ }).click();
    await expect(page.getByText(SPARE, { exact: true })).toHaveCount(0);
  });
});
