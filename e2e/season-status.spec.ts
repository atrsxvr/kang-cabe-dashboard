import { expect, test } from "@playwright/test";

/**
 * Tahap musim yang terlanjur ditekan bisa dimundurkan, dan musim yang
 * diarsipkan bisa dipulihkan — dua janji yang dulu ada di teks dialog tapi
 * tidak punya tombolnya.
 */

test.describe.configure({ mode: "serial" });

const SEASON = `E2E Musim Tahap ${Date.now()}`;

function seasonCard(page: import("@playwright/test").Page) {
  return page.locator('[data-slot="card"]:visible').filter({ hasText: SEASON });
}

test("maju satu tahap bertanya dulu, dan bisa dimundurkan", async ({ page }) => {
  await page.goto("/seasons");
  await page.getByRole("button", { name: "Tambah Musim" }).click();
  await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
  await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
  await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
  await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Simpan Musim" }).click();
  await expect(page).toHaveURL(/season=/);

  await page.goto("/seasons");
  const card = seasonCard(page);

  // Batal tidak mengubah apa pun.
  await card.getByRole("button", { name: "Berjalan", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Batal" }).click();
  await expect(card.getByText("Perencanaan").first()).toBeVisible();

  await card.getByRole("button", { name: "Berjalan", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ya, Berjalan" }).click();
  await expect(card.getByRole("button", { name: "Panen", exact: true })).toBeVisible();

  await card.getByRole("button", { name: "Kembalikan ke Perencanaan" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Kembalikan ke Perencanaan" })
    .click();
  await expect(card.getByRole("button", { name: "Berjalan", exact: true })).toBeVisible();
});

test("musim yang belum ditanam bisa diarsipkan lalu dipulihkan", async ({ page }) => {
  await page.goto("/seasons");
  const card = seasonCard(page);

  await card.getByRole("button", { name: `Arsipkan ${SEASON}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Arsipkan" }).click();
  await expect(card.getByRole("button", { name: "Pulihkan" })).toBeVisible();

  await card.getByRole("button", { name: "Pulihkan" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pulihkan" }).click();
  await expect(card.getByRole("button", { name: "Berjalan", exact: true })).toBeVisible();

  // Yang sedang berjalan tidak ditawari Arsipkan: tutup musim dulu.
  await card.getByRole("button", { name: "Berjalan", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ya, Berjalan" }).click();
  await expect(card.getByRole("button", { name: `Arsipkan ${SEASON}` })).toHaveCount(0);
});
