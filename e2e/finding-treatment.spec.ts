import { expect, test } from "@playwright/test";

/**
 * Temuan yang sudah didiagnosa dijadwalkan jadi tugas, dan begitu tugasnya
 * Selesai, temuannya ikut menjadi "Sudah ditangani" — tanpa diubah manual.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Temuan ${stamp}`;
const SYMPTOM = `E2E daun keriting ${stamp}`;
const DIAGNOSIS = `E2E thrips ${stamp}`;

test("jadwalkan penanganan, selesaikan tugasnya, temuannya tertangani", async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto("/seasons");
  await page.getByRole("button", { name: "Tambah Musim" }).click();
  await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
  await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
  await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
  await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Simpan Musim" }).click();
  await expect(page).toHaveURL(/season=/);
  const seasonId = new URL(page.url()).searchParams.get("season") ?? "";

  await page.goto(`/health?season=${seasonId}`);
  await page.getByRole("button", { name: "Catat Temuan" }).click();
  const report = page.getByRole("dialog");
  await report.getByLabel("Gejala yang terlihat").fill(SYMPTOM);
  await report.getByRole("button", { name: "Simpan Temuan" }).click();
  await expect(report).toBeHidden();

  const finding = page.locator('[data-slot="card"]').filter({ hasText: SYMPTOM });
  await finding.getByRole("button", { name: "Diagnosa" }).click();
  const diagnose = page.getByRole("dialog");
  await diagnose.getByLabel("Diagnosa", { exact: true }).fill(DIAGNOSIS);
  await diagnose.getByLabel("Perlakuan yang disarankan").fill("Semprot abamektin 1 ml/liter");
  await diagnose.getByRole("button", { name: "Simpan Diagnosa" }).click();
  await expect(diagnose).toBeHidden();

  // Form tugasnya sudah terisi dari temuan.
  await finding.getByRole("button", { name: "Jadwalkan penanganan" }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByLabel("Judul Tugas", { exact: true })).toHaveValue(
    `Penanganan: ${DIAGNOSIS}`
  );
  await form.getByRole("button", { name: "Simpan Tugas" }).click();
  await expect(form).toHaveCount(0);
  await expect(finding.getByRole("list", { name: "Tugas penanganan" })).toContainText(
    "belum dikerjakan"
  );

  await page.goto(`/tasks?season=${seasonId}`);
  const card = page
    .locator('[data-slot="card"]:visible')
    .filter({ hasText: `Penanganan: ${DIAGNOSIS}` });
  await card.getByRole("button", { name: "Pindahkan ke Dikerjakan" }).click();
  await card.getByRole("button", { name: "Pindahkan ke Selesai" }).click();
  await expect(card.getByRole("button", { name: "Pindahkan ke Selesai" })).toHaveCount(0);

  await page.goto(`/health?season=${seasonId}`);
  await expect(finding).toContainText("Sudah ditangani");
  await expect(finding.getByRole("list", { name: "Tugas penanganan" })).toContainText("selesai");
});
