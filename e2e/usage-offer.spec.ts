import { expect, test, type Page } from "@playwright/test";

/**
 * Marking a task Selesai asks for "Catat pemakaian" — from the board, from
 * the task form, and from the dashboard, which hands the question to the
 * tasks page. Asking is all it does: nothing leaves the shed until the
 * question is answered, and "Nanti saja" leaves the button on the card.
 *
 * A season and a material of its own, so the shed figures other specs check
 * are never touched.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Ajakan ${stamp}`;
const MATERIAL = `E2E Tali ${stamp}`;
const QUESTION = "Catat pemakaian bahannya sekarang?";
let seasonId = "";

function card(page: Page, title: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: title });
}

/** A task taking some of the material, due today, not yet started. */
async function addTask(page: Page, title: string, amount: string) {
  await page.goto(`/tasks?season=${seasonId}`);
  await page.getByRole("button", { name: "Tambah Tugas" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Judul Tugas", { exact: true }).fill(title);
  await form
    .getByLabel("Ambil bahan dari gudang (opsional)")
    .selectOption({ label: `${MATERIAL} · Perlengkapan` });
  await form.getByLabel("Jumlah", { exact: true }).fill(amount);
  await form.getByRole("button", { name: "Tambahkan" }).click();
  await form.getByRole("button", { name: "Simpan Tugas" }).click();
  await expect(form).toHaveCount(0);
  await expect(card(page, title)).toBeVisible();
}

test.describe.serial("tugas Selesai mengajak mencatat pemakaian", () => {
  test("menyiapkan musim dan bahannya", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();
    await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
    await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
    await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
    await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
    await page.getByRole("button", { name: "Simpan Musim" }).click();
    await expect(page).toHaveURL(/season=/);
    seasonId = new URL(page.url()).searchParams.get("season") ?? "";

    await page.goto("/inventory");
    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(MATERIAL);
    await page.getByLabel("Satuan", { exact: true }).selectOption("pcs");
    await page.getByLabel("Kategori", { exact: true }).selectOption("SUPPLIES");
    await page.getByLabel("Stok Awal", { exact: true }).fill("100");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();
    await expect(page.getByText(MATERIAL).first()).toBeVisible();
  });

  test("dari papan: Selesai langsung bertanya, dan stok berkurang setelah dijawab", async ({
    page,
  }) => {
    const TASK = `E2E Ikat ajir ${stamp}`;
    await addTask(page, TASK, "10");

    await card(page, TASK).getByRole("button", { name: "Pindahkan ke Dikerjakan" }).click();
    // The card moves column on each step and is mounted afresh — which is
    // why the question is held above the board, not on the card.
    await card(page, TASK).getByRole("button", { name: "Pindahkan ke Selesai" }).click();

    const question = page.getByRole("alertdialog");
    await expect(question).toContainText(QUESTION);
    await expect(question).toContainText(MATERIAL);
    await question.getByRole("button", { name: "Kurangi stok" }).click();

    await expect(question).toHaveCount(0);
    await expect(card(page, TASK).getByText(/Stok dikurangi/)).toBeVisible();
  });

  test("dari form tugas: Nanti saja tidak mengurangi apa pun", async ({ page }) => {
    const TASK = `E2E Ganti tali ${stamp}`;
    await addTask(page, TASK, "5");

    await page.getByRole("button", { name: `Edit ${TASK}` }).first().click();
    const form = page.getByRole("dialog");
    await form.getByLabel("Status", { exact: true }).selectOption("DONE");
    await form.getByRole("button", { name: "Simpan Perubahan" }).click();

    const question = page.getByRole("alertdialog");
    await expect(question).toContainText(QUESTION);
    await question.getByRole("button", { name: "Nanti saja" }).click();
    await expect(question).toHaveCount(0);

    // Still waiting on the card, to be answered later.
    await expect(card(page, TASK).getByRole("button", { name: "Catat pemakaian" })).toBeVisible();
    await expect(card(page, TASK).getByText(/Stok dikurangi/)).toHaveCount(0);
  });

  test("dari Dashboard: toast-nya membawa ke halaman tugas dengan pertanyaan terbuka", async ({
    page,
  }) => {
    const TASK = `E2E Cek tali ${stamp}`;
    await addTask(page, TASK, "1");

    await page.goto(`/?season=${seasonId}`);
    const row = page.getByRole("listitem").filter({ hasText: TASK });
    await row.getByRole("button", { name: "Pindahkan ke Dikerjakan" }).click();
    await row.getByRole("button", { name: "Pindahkan ke Selesai" }).click();

    const toast = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Bahannya belum dicatat keluar dari gudang." });
    await toast.getByRole("button", { name: "Catat pemakaian" }).click();

    await expect(page).toHaveURL(/\/tasks\?.*catat=/);
    const question = page.getByRole("alertdialog");
    await expect(question).toContainText(TASK);
    await question.getByRole("button", { name: "Nanti saja" }).click();

    // Answered, so a reload does not ask again.
    await expect(page).not.toHaveURL(/catat=/);
    await page.reload();
    await expect(card(page, TASK)).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });
});
