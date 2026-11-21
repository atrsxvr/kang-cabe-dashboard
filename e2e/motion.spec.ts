import { expect, test, type Page } from "@playwright/test";

/**
 * The feedback after a save: the button says "Tersimpan" before the dialog
 * goes, the first picking of a season gets its shower of chillies, and from
 * then on the row just typed is the one that lights up.
 *
 * None of it is decoration only. The tick is what stops a slow save from
 * being typed twice, and the lit row is how anyone finds what they entered in
 * a long list — so each is checked where it actually happens, after a real
 * Server Action and a real refresh.
 *
 * Works inside a season of its own, which the teardown cascades away.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Gerak ${stamp}`;

let seasonId = "";

const harvestPage = (page: Page) => page.goto(`/harvest?season=${seasonId}`);

async function recordHarvest(page: Page, date: string, kg: string) {
  await page.getByRole("button", { name: "Catat Panen" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tanggal Panen", { exact: true }).fill(date);
  await dialog.getByLabel("Bagus (kg)", { exact: true }).fill(kg);
  await dialog.getByRole("button", { name: "Simpan Panen" }).click();
  return dialog;
}

test.describe.serial("gerak setelah menyimpan", () => {
  test("menyiapkan musimnya sendiri", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();

    await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
    await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
    await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
    await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
    await page.getByRole("button", { name: "Simpan Musim" }).click();

    await expect(page).toHaveURL(/season=/);
    seasonId = new URL(page.url()).searchParams.get("season") ?? "";
    expect(seasonId).toBeTruthy();
  });

  test("halaman kosong punya gambarnya sendiri", async ({ page }) => {
    await harvestPage(page);

    const main = page.getByRole("main");
    // Exact: the page description says "belum ada panen tercatat" too, and
    // text matching ignores case.
    await expect(
      main.getByText("Belum ada panen tercatat", { exact: true }),
    ).toBeVisible();
    await expect(main.locator("svg .empty-plant")).toBeVisible();
  });

  test("panen pertama: centang dulu, lalu hujan cabai", async ({ page }) => {
    await harvestPage(page);
    const dialog = await recordHarvest(page, "2026-06-01", "12");

    // The tick shows in the dialog before it closes — the last thing seen in
    // it is that the save worked.
    await expect(
      dialog.getByRole("button", { name: "Tersimpan" }),
    ).toBeVisible();
    await expect(dialog).toBeHidden();

    await expect(
      page.getByText("Panen pertama musim ini tercatat."),
    ).toBeVisible();
    // The shower is a layer of its own, gone again within three seconds.
    const shower = page.locator('body > div[aria-hidden="true"][style*="z-index: 90"]');
    await expect(shower).toHaveCount(1);
    await expect(shower).toHaveCount(0, { timeout: 5_000 });
  });

  test("petikan berikutnya: barisnya yang menyala, sekali", async ({
    page,
  }) => {
    await harvestPage(page);
    const main = page.getByRole("main");

    // Arriving on the page is not news: nothing is lit.
    await expect(main.locator("[data-fresh-key]").first()).toBeAttached();
    await expect(main.locator("[data-fresh-now]")).toHaveCount(0);

    const dialog = await recordHarvest(page, "2026-06-03", "7");
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Panen tercatat.")).toBeVisible();

    // The new picking, and only that one, in whichever list is showing.
    const lit = main.locator("[data-fresh-now]:visible");
    await expect(lit).toHaveCount(1);
    await expect(lit).toContainText("7");
    // And it fades back by itself.
    await expect(main.locator("[data-fresh-now]")).toHaveCount(0, {
      timeout: 5_000,
    });
  });
});
