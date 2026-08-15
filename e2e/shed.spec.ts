import { expect, test, type Page } from "@playwright/test";

/**
 * The loop the whole shed exists for: a material is registered, it is worth
 * something, a task consumes it, and that consumption turns up as a cost
 * against the season that consumed it.
 *
 * Every step here crosses the browser, a Server Action and Postgres. The unit
 * tests cover the arithmetic; only this covers the wiring.
 */

const MATERIAL = `E2E Ajir ${Date.now()}`;
const SEASON = `E2E Musim ${Date.now()}`;

async function openInventory(page: Page) {
  await page.goto("/inventory");
  await expect(
    page.getByRole("heading", { name: /Inventaris/i }).first()
  ).toBeVisible();
}

test.describe.serial("bahan masuk gudang lalu jadi biaya musim", () => {
  test("mendaftarkan bahan lengkap dengan nilai stok awalnya", async ({
    page,
  }) => {
    await openInventory(page);

    await page.getByRole("button", { name: "Tambah Bahan" }).click();

    await page.getByLabel("Nama Bahan", { exact: true }).fill(MATERIAL);
    await page.getByLabel("Satuan", { exact: true }).selectOption("pcs");
    await page.getByLabel("Kategori", { exact: true }).selectOption("SUPPLIES");
    await page.getByLabel("Stok Awal", { exact: true }).fill("1000");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("100");
    await page.getByLabel("Nilai stok awal (Rp)", { exact: true }).fill("500000");

    await page.getByRole("button", { name: "Simpan Bahan" }).click();

    // Rp 500.000 over 1000 pcs, so the shed is worth exactly what was paid.
    await expect(page.getByText(MATERIAL).first()).toBeVisible();
  });

  test("bahan perlengkapan tidak ditawarkan ke form racikan", async ({
    page,
  }) => {
    await page.goto("/health/racikan");
    await page.getByRole("button", { name: "Tambah Racikan" }).click();

    const picker = page.getByLabel("Bahan 1", { exact: true });
    await expect(picker).toBeVisible();

    // A dose per litre of bamboo means nothing, so it must not be offerable.
    await expect(picker.getByRole("option", { name: MATERIAL })).toHaveCount(0);
  });

  test("tugas bisa mengambil bahan langsung dari gudang", async ({ page }) => {
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Tambah Tugas" }).click();

    await page.getByLabel("Judul Tugas", { exact: true }).fill("E2E Pasang ajir");

    const shed = page.getByLabel("Ambil bahan dari gudang (opsional)");
    await shed.selectOption({ label: `${MATERIAL} · Perlengkapan` });
    await page.getByLabel("Jumlah", { exact: true }).fill("800");
    await page.getByRole("button", { name: "Tambahkan" }).click();

    await expect(page.getByText(MATERIAL).first()).toBeVisible();

    await page.getByLabel("Status", { exact: true }).selectOption("DONE");
    await page.getByRole("button", { name: "Simpan Tugas" }).click();

    await expect(
      page.getByText("E2E Pasang ajir").first()
    ).toBeVisible();
  });

  test("stok baru berkurang setelah pemakaian dicatat", async ({ page }) => {
    await page.goto("/tasks");

    // Deliberately not automatic: finishing a task is not proof its materials
    // were used, so the deduction waits to be asked for.
    await page
      .getByRole("button", { name: "Catat pemakaian" })
      .first()
      .click();
    await page.getByRole("button", { name: "Kurangi stok" }).click();

    await expect(page.getByText(/Stok dikurangi/).first()).toBeVisible();

    await openInventory(page);
    await expect(page.getByText("200 pcs").first()).toBeVisible();
  });

  test("biayanya muncul di Keuangan musim itu", async ({ page }) => {
    await page.goto("/finance");

    // 800 pcs at Rp 500 each.
    await expect(page.getByText("Rp 400.000").first()).toBeVisible();
    await expect(page.getByText(MATERIAL).first()).toBeVisible();
  });

  test("bahan diarsipkan, bukan dihapus, dan bisa dikembalikan", async ({
    page,
  }) => {
    await openInventory(page);

    await page
      .getByRole("button", { name: `Arsipkan ${MATERIAL}` })
      .first()
      .click();
    await page.getByRole("button", { name: "Arsipkan", exact: true }).click();

    await expect(page.getByText(MATERIAL)).toHaveCount(0);

    // The history it carries is why it is archived rather than deleted, so it
    // has to be reachable again.
    await page.getByRole("button", { name: /^Arsip \(/ }).click();
    await expect(page.getByText(MATERIAL).first()).toBeVisible();

    await page
      .getByRole("button", { name: `Kembalikan ${MATERIAL}` })
      .first()
      .click();
  });
});

test("musim yang dipilih ikut terbawa pindah halaman", async ({ page }) => {
  // Makes its own season rather than leaning on whatever happens to be in the
  // database: with a single selectable season, picking it again fires no
  // change event and the test would quietly pass by doing nothing.
  await page.goto("/seasons");
  await page.getByRole("button", { name: "Tambah Musim" }).click();

  await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
  await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
  await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
  await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
  await page.getByRole("button", { name: "Simpan Musim" }).click();

  // Creating a season switches to it, which is the context you are about to
  // work in — and that switch is what puts it in the URL.
  await expect(page).toHaveURL(/season=/);
  const season = new URL(page.url()).searchParams.get("season");
  expect(season).toBeTruthy();

  // Kept in the URL rather than a cookie precisely so it survives this, and so
  // "what I am looking at" can be sent to someone else as a link. On a phone
  // the nav lives in a drawer, which is the only way to reach it.
  await page.getByRole("button", { name: "Buka menu" }).click();
  await page.getByRole("link", { name: /Keuangan/i }).first().click();
  await expect(page).toHaveURL(new RegExp(`season=${season}`));
  await expect(
    page.getByRole("heading", { name: /Keuangan/i }).first()
  ).toBeVisible();
});
