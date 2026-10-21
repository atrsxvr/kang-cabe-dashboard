import { expect, test, type Page } from "@playwright/test";

/**
 * Wages: hired hands, paid per job once it is done.
 *
 * A wage says which job and to whom, can name the finished task it paid for,
 * and shows up three ways — in the ledger, split by job in the cost
 * breakdown, and on the task itself. A season of its own, so the teardown
 * takes the task and the entry with it.
 */

const stamp = Date.now();
const SEASON = `E2E Musim Upah ${stamp}`;
const TASK = `E2E Olah lahan ${stamp}`;
const PAYEE = `E2E Mang Asep ${stamp}`;
const NOTE = `E2E borongan olah lahan ${stamp}`;
let seasonId = "";

async function openNotes(page: Page) {
  await page.goto(`/finance?season=${seasonId}`);
  await page.getByRole("tab", { name: /Catatan/ }).click();
}

test.describe.serial("upah borongan", () => {
  test("menyiapkan musim dengan satu tugas yang sudah selesai", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();
    await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
    await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
    await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
    await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
    await page.getByRole("button", { name: "Simpan Musim" }).click();
    await expect(page).toHaveURL(/season=/);
    seasonId = new URL(page.url()).searchParams.get("season") ?? "";

    await page.goto(`/tasks?season=${seasonId}`);
    await page.getByRole("button", { name: "Tambah Tugas" }).click();
    await page.getByLabel("Judul Tugas", { exact: true }).fill(TASK);
    await page.getByLabel("Status", { exact: true }).selectOption("DONE");
    await page.getByRole("button", { name: "Simpan Tugas" }).click();
    await expect(page.getByText(TASK).first()).toBeVisible();
  });

  test("upah dicatat dengan pekerjaan, penerima, dan tugasnya", async ({ page }) => {
    await page.goto(`/finance?season=${seasonId}`);
    await page.getByRole("button", { name: "Catat Uang Masuk / Keluar" }).click();
    const dialog = page.getByRole("dialog");

    // Upah is the default category, so the wage fields are already there.
    await expect(dialog.getByLabel("Pekerjaan", { exact: true })).toBeVisible();

    await dialog.getByLabel("Pekerjaan", { exact: true }).fill("Olah lahan");
    await dialog.getByLabel("Dibayar ke", { exact: true }).fill(PAYEE);
    const taskOption = dialog
      .getByLabel("Untuk tugas (opsional)", { exact: true })
      .locator("option", { hasText: TASK });
    await dialog
      .getByLabel("Untuk tugas (opsional)", { exact: true })
      .selectOption({ label: (await taskOption.textContent()) ?? TASK });
    await dialog.getByLabel("Jumlah (Rp)").fill("1500000");
    await dialog.getByLabel("Keterangan", { exact: true }).fill(NOTE);
    await dialog.getByRole("button", { name: "Simpan Catatan" }).click();
    await expect(dialog).toBeHidden();

    // In the ledger…
    await page.getByRole("tab", { name: /Catatan/ }).click();
    const entry = page.locator('[data-slot="card"]').filter({ hasText: NOTE });
    await expect(entry).toContainText(`Olah lahan · ke ${PAYEE}`);
    await expect(entry).toContainText(`tugas ${TASK}`);

    // …split by job in the breakdown…
    await page.getByRole("tab", { name: "Rincian" }).click();
    await expect(page.getByText(/olah lahan Rp\s1\.500\.000/).first()).toBeVisible();

    // …and on the task it paid for.
    await page.goto(`/tasks?season=${seasonId}`);
    await expect(
      page.getByText(new RegExp(`Upah borongan Rp\\s1\\.500\\.000 · ${PAYEE}`)).first()
    ).toBeVisible();
  });

  test("bukan upah lagi, maka pekerjaan dan penerimanya ikut lepas", async ({ page }) => {
    await openNotes(page);
    const entry = page.locator('[data-slot="card"]').filter({ hasText: NOTE });
    await entry.getByRole("button", { name: "Edit catatan" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Kategori", { exact: true }).selectOption("Sewa");
    await expect(dialog.getByLabel("Pekerjaan", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(dialog).toBeHidden();

    // The server cleared them — not just the form hiding them.
    await expect(entry).not.toContainText(PAYEE);
    await page.goto(`/tasks?season=${seasonId}`);
    await expect(page.getByText(/Upah borongan/)).toHaveCount(0);
  });
});
