import { expect, test } from "@playwright/test";

/**
 * Tugas yang tidak jadi dikerjakan hari ini — hujan, atau tim tidak ada —
 * dipindah dengan Tunda, dan HST-nya ikut pindah bersama tanggalnya.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Tunda ${stamp}`;
const TASK = `E2E Semprot tertunda ${stamp}`;

test("tugas hari ini ditunda ke besok, HST-nya ikut maju", async ({ page }) => {
  await page.goto("/seasons");
  await page.getByRole("button", { name: "Tambah Musim" }).click();
  await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
  await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
  await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
  await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Simpan Musim" }).click();
  await expect(page).toHaveURL(/season=/);
  const seasonId = new URL(page.url()).searchParams.get("season") ?? "";

  // Bertanggal hari ini, bawaan formnya. HST tidak diketik: ia dibaca dari
  // tanggalnya.
  await page.goto(`/tasks?season=${seasonId}`);
  await page.getByRole("button", { name: "Tambah Tugas" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Judul Tugas", { exact: true }).fill(TASK);
  await expect(form.getByLabel("HST Rencana (opsional)")).toHaveCount(0);
  await expect(form).toContainText(/Jatuh di HST \d+/);
  await form.getByRole("button", { name: "Simpan Tugas" }).click();
  await expect(form).toHaveCount(0);

  const card = page.locator('[data-slot="card"]:visible').filter({ hasText: TASK });
  const before = Number((await card.getByText(/^HST \d+$/).innerText()).replace(/\D/g, ""));

  await card.getByRole("button", { name: `Tunda ${TASK}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Besok/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(card.getByText(`HST ${before + 1}`, { exact: true })).toBeVisible();
  // Tidak lagi jatuh hari ini, jadi tidak ditawari Tunda lagi.
  await expect(card.getByRole("button", { name: `Tunda ${TASK}` })).toHaveCount(0);
});
