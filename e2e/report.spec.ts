import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

/**
 * The season report and the spreadsheet exports.
 *
 * Both exist to carry the numbers out of the app — onto paper when the margin
 * is split, into Excel as a copy the members hold themselves — so what is
 * checked is that the figures arriving there are the ones recorded, and that
 * the files refuse anyone without a live session.
 *
 * A season of its own, with one picking and one sale of known size, so the
 * figures asserted cannot be blurred by anything else in the database.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Laporan ${stamp}`;
const BUYER = `E2E Bu Laporan ${stamp}`;

let seasonId = "";

test.describe.serial("laporan musim dan unduhan", () => {
  test("menyiapkan musim dengan satu panen dan satu penjualan", async ({
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
    expect(seasonId).toBeTruthy();

    await page.goto(`/harvest?season=${seasonId}`);
    await page.getByRole("button", { name: "Catat Panen" }).click();
    await page.getByLabel("Tanggal Panen", { exact: true }).fill("2026-06-01");
    await page.getByLabel("Bagus (kg)", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Simpan Panen" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Catat Penjualan" }).click();
    await page.getByLabel("Tanggal Jual", { exact: true }).fill("2026-06-02");
    await page.getByLabel("Pembeli", { exact: true }).fill(BUYER);
    await page.getByLabel("Bobot Bagus").fill("10");
    await page.getByLabel("Harga Bagus per kg").fill("30000");
    await page.getByRole("button", { name: "Simpan Penjualan" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("laporan dibuka dari Keuangan dan memuat angka musimnya", async ({
    page,
  }) => {
    await page.goto(`/finance?season=${seasonId}`);
    await page.getByRole("link", { name: "Laporan & Unduh" }).click();

    await expect(page).toHaveURL(new RegExp(`/laporan/${seasonId}`));
    await expect(page.getByRole("heading", { name: SEASON })).toBeVisible();

    // Still running, so the report has to say its numbers are provisional.
    await expect(page.getByText(/belum ditutup/)).toBeVisible();

    // 10 kg × Rp 30.000, already a multiple of Rp 500.
    const summary = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Ringkasan uang" }),
    });
    await expect(summary).toContainText("Rp 300.000");

    const sales = page.locator("section").filter({
      has: page.getByRole("heading", { name: /^Penjualan/ }),
    });
    await expect(sales).toContainText(BUYER);
    await expect(sales).toContainText("Belum");

    await expect(
      page.getByRole("button", { name: "Cetak / Simpan PDF" })
    ).toBeVisible();
  });

  test("unduhan penjualan berisi nota musim itu, siap dibuka Excel", async ({
    page,
  }) => {
    await page.goto(`/laporan/${seasonId}`);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Penjualan" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^kangcabe-penjualan-.*\.csv$/);

    const csv = readFileSync((await download.path())!, "utf8");
    // The byte order mark is what makes Excel read it as UTF-8.
    expect(csv.charCodeAt(0)).toBe(0xfeff);

    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe(
      "Tanggal;Pembeli;Mutu;Bobot (kg);Harga per kg;Jumlah baris;Pembulatan;Total nota;Status bayar;Tanggal lunas;Dicatat oleh;Catatan"
    );
    expect(lines[1]).toContain(`2026-06-02;${BUYER};Bagus;10;30000;300000;0;300000;Belum`);
  });

  test("riwayat stok gudang bisa diunduh tanpa memilih musim", async ({
    page,
  }) => {
    await page.goto(`/laporan/${seasonId}`);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: /Riwayat stok gudang/ }).click(),
    ]);

    const csv = readFileSync((await download.path())!, "utf8");
    expect(csv.slice(1).split("\r\n")[0]).toBe(
      "Tanggal;Bahan;Kategori;Satuan;Perubahan;Alasan;Nilai (Rp);Dibebankan ke musim;Dicatat oleh;Catatan"
    );
  });
});

test.describe("unduhan tanpa sesi", () => {
  test("cookie palsu ditolak, bukan dilayani", async ({ playwright }) => {
    const baseURL = test.info().project.use.baseURL;
    // Gets past the proxy, which only checks that a cookie exists. The route
    // itself has to be what stops it.
    const anonymous = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
      extraHTTPHeaders: { cookie: "better-auth.session_token=palsu" },
    });

    const response = await anonymous.get("/api/ekspor/stok", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toContain("Tanggal;Bahan");

    await anonymous.dispose();
  });

  test("jenis yang tidak dikenal tidak membocorkan apa pun", async ({
    request,
  }) => {
    const response = await request.get("/api/ekspor/pengguna");
    expect(response.status()).toBe(404);
  });
});
