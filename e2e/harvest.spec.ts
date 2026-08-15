import { expect, test, type Page } from "@playwright/test";

/**
 * The other half of the money: chillies are picked, some sit waiting, some go
 * out, and the buyer pays later. Every step crosses the browser, a Server
 * Action and Postgres — and both the unsold balance and the season margin are
 * derived, so nothing here can be checked by reading a column.
 *
 * Works inside a season of its own so the teardown can cascade it all away
 * rather than picking harvest rows out of the garden's real records.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Panen ${stamp}`;
const BUYER = `E2E Pak Dedi ${stamp}`;

let seasonId = "";

const harvestPage = (page: Page) => page.goto(`/harvest?season=${seasonId}`);

test.describe.serial("panen, jual, tagih", () => {
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

  test("mencatat petikan yang dipisah per mutu", async ({ page }) => {
    await harvestPage(page);
    await page.getByRole("button", { name: "Catat Panen" }).click();

    await page.getByLabel("Tanggal Panen", { exact: true }).fill("2026-06-01");
    await page.getByLabel("Bagus (kg)", { exact: true }).fill("20");
    // A comma decimal, the way it is written in the garden.
    await page.getByLabel("Afkir (kg)", { exact: true }).fill("5,5");

    await expect(page.getByText("25,5 kg")).toBeVisible();
    await page.getByRole("button", { name: "Simpan Panen" }).click();

    // The running total carries both decimals; the row itself drops the zero.
    await expect(page.getByText("25,50 kg").first()).toBeVisible();
    await expect(page.getByText("25,5 kg").first()).toBeVisible();
  });

  test("belum ada yang dijual, jadi semuanya masih di tangan", async ({
    page,
  }) => {
    await harvestPage(page);

    const unsold = page.getByText("Sisa belum terjual").locator("..");
    await expect(unsold).toContainText("20 kg");
    await expect(unsold).toContainText("5,5 kg");
  });

  test("menghitung sesi petik dan hasil per pohon", async ({ page }) => {
    await harvestPage(page);

    const main = page.getByRole("main");

    await expect(main.getByText("Sesi petik")).toBeVisible();
    await expect(main.getByText("rata-rata 25,5 kg sekali petik")).toBeVisible();

    // 25,5 kg from the 100 plants this season was created with.
    await expect(main.getByText("Hasil per pohon")).toBeVisible();
    await expect(main.getByText("255 g/pohon")).toBeVisible();
  });

  test("menjual dua mutu sekaligus dengan harga berbeda", async ({ page }) => {
    await harvestPage(page);
    await page.getByRole("button", { name: "Catat Penjualan" }).click();

    await page.getByLabel("Tanggal Jual", { exact: true }).fill("2026-06-02");
    await page.getByLabel("Pembeli", { exact: true }).fill(BUYER);

    await page.getByLabel("Bobot Bagus").fill("15");
    await page.getByLabel("Harga Bagus per kg").fill("45000");
    await page.getByLabel("Bobot Afkir").fill("5");
    await page.getByLabel("Harga Afkir per kg").fill("15000");

    // 15 × 45.000 + 5 × 15.000
    await expect(page.getByText("Rp 750.000").first()).toBeVisible();
    await page.getByRole("button", { name: "Simpan Penjualan" }).click();

    // The page lands back on the harvest tab; sales live in their own.
    await page.getByRole("tab", { name: /Penjualan/ }).click();
    await expect(page.getByText(BUYER).first()).toBeVisible();
  });

  test("sisa ikut berkurang, dan tagihannya berdiri sendiri", async ({
    page,
  }) => {
    await harvestPage(page);

    const unsold = page.getByText("Sisa belum terjual").locator("..");
    await expect(unsold).toContainText("5 kg");
    await expect(unsold).toContainText("0,5 kg");

    // Left unpaid on purpose, so it shows as money still owed.
    await expect(page.getByText("Rp 750.000").first()).toBeVisible();
  });

  test("tagihan yang belum dibayar punya tabnya sendiri", async ({ page }) => {
    await harvestPage(page);

    await page.getByRole("tab", { name: /Piutang/ }).click();
    await expect(page.getByText(BUYER).first()).toBeVisible();

    await page.getByRole("button", { name: "Tandai lunas" }).first().click();

    // Settling it takes it off the chase list, which is the point of the tab.
    await expect(
      page.getByText(/Nggak ada tagihan yang menggantung/)
    ).toBeVisible();

    await page.getByRole("tab", { name: /Penjualan/ }).click();
    await expect(page.getByText(/^Lunas/).first()).toBeVisible();
  });

  test("seperempat kilo tetap seperempat kilo", async ({ page }) => {
    await harvestPage(page);
    await page.getByRole("button", { name: "Catat Penjualan" }).click();

    await page.getByLabel("Tanggal Jual", { exact: true }).fill("2026-06-03");
    await page.getByLabel("Pembeli", { exact: true }).fill(`${BUYER} kecil`);
    await page.getByLabel("Bobot Bagus").fill("0,25");
    await page.getByLabel("Harga Bagus per kg").fill("45000");

    // Not 0,3 kg — a quarter kilo is a real sale. And 11.250 is not a sum
    // that changes hands, so it is lifted to the nearest five hundred.
    await expect(page.getByText("0,25 kg").first()).toBeVisible();
    await expect(page.getByText("Rp 11.500").first()).toBeVisible();
    await expect(page.getByText(/dibulatkan naik/)).toBeVisible();

    await page.getByRole("button", { name: "Simpan Penjualan" }).click();

    await page.getByRole("tab", { name: /Penjualan/ }).click();
    await expect(page.getByText("0,25 kg").first()).toBeVisible();
  });

  test("pemasukannya sampai ke Keuangan", async ({ page }) => {
    await page.goto(`/finance?season=${seasonId}`);

    // Scoped to the page body: the sidebar drawer holds a hidden link called
    // "Panen & Penjualan", which any loose match on "jualan" finds first.
    const main = page.getByRole("main");

    await expect(main.getByText("Masuk", { exact: true })).toBeVisible();
    // 750.000 from the first load plus 11.500 for the rounded quarter kilo.
    await expect(main.getByText("Rp 761.500").first()).toBeVisible();
    await expect(main.getByText(/jualan/).first()).toBeVisible();

    // Named honestly: it is only as accurate as what has been written down.
    await expect(page.getByText(/Seakurat apa yang kalian catat/)).toBeVisible();
  });

  test("dan ke kartu panen di Dashboard", async ({ page }) => {
    await page.goto(`/?season=${seasonId}`);

    await expect(page.getByText("Total Panen Sementara")).toBeVisible();
    await expect(page.getByText("25,50").first()).toBeVisible();
  });
});
