import { expect, test, type Page } from "@playwright/test";

import { pickMaterial } from "./material";

/**
 * Catat Belanja: barang baru dan yang sudah ada, bahan dan alat, satu nota —
 * dan uangnya keluar dari kas. Lalu sisi sebaliknya: tugas yang pemakaiannya
 * sudah dicatat dihapus, stoknya kembali, kasnya tidak bergerak.
 *
 * Yang dicek selisih saldo kas, bukan saldo mutlak: basis datanya dipakai
 * bersama spec lain yang juga belanja.
 */

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const SEASON = `E2E Musim Belanja ${stamp}`;
const MATERIAL = `E2E Pupuk Belanja ${stamp}`;
const TOOL = `E2E Cangkul ${stamp}`;
const TASK = `E2E Kocor belanja ${stamp}`;
let seasonId = "";

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

/** The phone's card for the material; the desktop table is a hidden card too. */
function stockCard(page: Page) {
  return page.locator('[data-slot="card"]:visible').filter({ hasText: MATERIAL });
}

test("menyiapkan musimnya", async ({ page }) => {
  await page.goto("/seasons");
  await page.getByRole("button", { name: "Tambah Musim" }).click();
  await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
  await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
  await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
  await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Simpan Musim" }).click();
  await expect(page).toHaveURL(/season=/);
  seasonId = new URL(page.url()).searchParams.get("season") ?? "";
});

test("bahan baru dan alat baru dalam satu belanja, kas berkurang", async ({
  page,
}) => {
  const before = await balance(page);

  await page.goto("/inventory");
  await page.getByRole("button", { name: "Catat Belanja" }).click();
  const form = page.getByRole("dialog");

  // Bahan baru — terdaftar di gudang begitu belanjanya disimpan.
  await form.getByRole("button", { name: "Baru", exact: true }).click();
  await form.getByLabel("Nama bahan baru", { exact: true }).fill(MATERIAL);
  await form.getByLabel("Satuan", { exact: true }).selectOption("kg");
  await form.getByLabel("Jumlah (kg)", { exact: true }).fill("2");
  await form.getByLabel("Total bayar (Rp)", { exact: true }).fill("100000");
  await form.getByRole("button", { name: "Tambahkan ke daftar" }).click();
  await expect(form.getByRole("list", { name: "Daftar belanja" })).toContainText(MATERIAL);

  // Alat baru, dibiarkan di isian: Simpan ikut membawanya.
  await form.getByRole("button", { name: "Alat", exact: true }).click();
  await form.getByRole("button", { name: "Baru", exact: true }).click();
  await form.getByLabel("Nama alat baru", { exact: true }).fill(TOOL);
  await form.getByLabel("Jumlah (unit)", { exact: true }).fill("1");
  await form.getByLabel("Total bayar (Rp)", { exact: true }).fill("75000");
  await form.getByLabel("Catatan (opsional)").fill(`E2E Toko ${stamp}`);
  await form.getByRole("button", { name: "Simpan Belanja" }).click();
  await expect(form).toHaveCount(0);

  await expect(stockCard(page)).toContainText("2 kg");
  await page.getByRole("tab", { name: /Alat Kebun/ }).click();
  await expect(page.getByText(TOOL).first()).toBeVisible();

  await expect.poll(() => balance(page)).toBe(before - 175_000);
  await expect(page.getByText(`E2E Toko ${stamp}`).first()).toBeVisible();
});

test("bahan yang sudah ada dibeli lagi dari tombol + di barisnya", async ({
  page,
}) => {
  const before = await balance(page);

  await page.goto("/inventory");
  await page.getByRole("button", { name: `Belanja ${MATERIAL}` }).first().click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Jumlah (kg)", { exact: true }).fill("1");
  await form.getByLabel("Total bayar (Rp)", { exact: true }).fill("50000");
  await form.getByRole("button", { name: "Simpan Belanja" }).click();
  await expect(form).toHaveCount(0);
  await expect(stockCard(page)).toContainText("3 kg");

  await expect.poll(() => balance(page)).toBe(before - 50_000);
});

test("nama bahan yang sudah ada tidak bisa didaftarkan dua kali", async ({
  page,
}) => {
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Catat Belanja" }).click();
  const form = page.getByRole("dialog");
  await form.getByRole("button", { name: "Baru", exact: true }).click();
  await form.getByLabel("Nama bahan baru", { exact: true }).fill(MATERIAL.toLowerCase());
  await expect(form).toContainText("sudah terdaftar");

  await form.getByRole("button", { name: "Pakai yang sudah ada" }).click();
  await expect(form.getByLabel("Bahan", { exact: true })).toHaveValue(MATERIAL);
});

test("tugas yang pemakaiannya sudah dicatat dihapus: stok kembali, kas diam", async ({
  page,
}) => {
  await page.goto(`/tasks?season=${seasonId}`);
  await page.getByRole("button", { name: "Tambah Tugas" }).click();
  const taskForm = page.getByRole("dialog");
  await taskForm.getByLabel("Judul Tugas", { exact: true }).fill(TASK);
  await pickMaterial(taskForm, "Ambil bahan dari gudang (opsional)", MATERIAL);
  await taskForm.getByLabel("Jumlah", { exact: true }).fill("0,5");
  await taskForm.getByRole("button", { name: "Tambahkan" }).click();
  await taskForm.getByRole("button", { name: "Simpan Tugas" }).click();
  await expect(taskForm).toHaveCount(0);

  const card = page.locator('[data-slot="card"]').filter({ hasText: TASK });
  await card.getByRole("button", { name: "Catat pemakaian" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Kurangi stok" }).click();
  await expect(card.getByText(/Stok dikurangi/)).toBeVisible();

  await page.goto("/inventory");
  await expect(stockCard(page)).toContainText("2,5 kg");

  const before = await balance(page);

  await page.goto(`/tasks?season=${seasonId}`);
  await card.getByRole("button", { name: `Hapus ${TASK}` }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("dikembalikan ke stok");
  await confirm.getByRole("button", { name: /Hapus/ }).click();
  await expect(card).toHaveCount(0);

  await page.goto("/inventory");
  await expect(stockCard(page)).toContainText("3 kg");

  // Pemakaian bukan uang keluar, jadi membatalkannya juga bukan uang masuk.
  expect(await balance(page)).toBe(before);
});
