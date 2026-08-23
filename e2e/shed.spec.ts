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
/**
 * Bahan bersatuan gram, didaftarkan spec ini sendiri.
 *
 * Ada karena kegagalan nyata: tes di bawah dulu mengandalkan gudang sungguhan
 * kebun ini memuat sesuatu yang bisa ditakar per liter. Begitu basis datanya
 * dikosongkan, tombol "Tambah Racikan" dinonaktifkan dengan benar — dan tesnya
 * mati menunggu tombol yang aplikasinya memang sengaja matikan.
 *
 * Sekarang ia mendaftarkan kedua sisinya, dan itu justru lebih kuat: yang
 * membuktikan penyaringnya bekerja bukan cuma bahwa ajir tidak ditawarkan, tapi
 * bahwa pupuk ditawarkan pada saat yang sama.
 */
const DOSEABLE = `E2E Pupuk ${Date.now()}`;
const SEASON = `E2E Musim ${Date.now()}`;
const SHED_SEASON = `E2E Musim Gudang ${Date.now()}`;

/**
 * The season this block charges its spending to, captured when it is created.
 *
 * Carried explicitly through every URL rather than leaning on whichever season
 * the app happens to open on. Sharing a season with real data means the figure
 * this test is looking for gets added to whatever else that season spent, and
 * the assertion stops describing anything. The season-switch test below already
 * learned this; the lesson applies to money just as much as to navigation.
 */
let shedSeasonId = "";

async function openInventory(page: Page) {
  await page.goto("/inventory");
  await expect(
    page.getByRole("heading", { name: /Inventaris/i }).first()
  ).toBeVisible();
}

test.describe.serial("bahan masuk gudang lalu jadi biaya musim", () => {
  test("menyiapkan musim sendiri buat menampung biayanya", async ({ page }) => {
    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();

    await page.getByLabel("Nama Musim", { exact: true }).fill(SHED_SEASON);
    await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
    await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
    // 20 kg target atas biaya Rp 400.000 yang bakal tercatat di bawah, jadi
    // modal proyeksinya Rp 20.000/kg — angka bulat yang tiernya bisa dieja.
    await page.getByLabel("Proyeksi Panen (kg)", { exact: true }).fill("20");
    await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
    await page.getByRole("button", { name: "Simpan Musim" }).click();

    await expect(page).toHaveURL(/season=/);
    shedSeasonId = new URL(page.url()).searchParams.get("season") ?? "";
    expect(shedSeasonId).toBeTruthy();
  });

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

  test("mendaftarkan bahan yang bisa ditakar per liter", async ({ page }) => {
    await openInventory(page);

    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(DOSEABLE);
    await page.getByLabel("Satuan", { exact: true }).selectOption("gram");
    await page
      .getByLabel("Kategori", { exact: true })
      .selectOption("FERTILIZER");
    await page.getByLabel("Stok Awal", { exact: true }).fill("5000");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("500");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();

    await expect(page.getByText(DOSEABLE).first()).toBeVisible();
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
    // Dan pupuknya harus ada — tanpa sisi ini, penyaring yang membuang
    // segalanya juga akan lulus.
    await expect(picker.getByRole("option", { name: DOSEABLE })).toHaveCount(1);
  });

  test("tugas bisa mengambil bahan langsung dari gudang", async ({ page }) => {
    await page.goto(`/tasks?season=${shedSeasonId}`);
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
    await page.goto(`/tasks?season=${shedSeasonId}`);

    // Deliberately not automatic: finishing a task is not proof its materials
    // were used, so the deduction waits to be asked for.
    await page
      .getByRole("button", { name: "Catat pemakaian" })
      .first()
      .click();
    await page.getByRole("button", { name: "Kurangi stok" }).click();

    // Scoped to this task's own card, and that is the whole point. Unscoped,
    // this was the step that waited for the server action to land — and the
    // moment the season held a second task whose usage had already been
    // recorded, its "Stok dikurangi" satisfied the wait instantly. The test
    // then read the shed before the deduction arrived and failed on a number
    // that was about to be right.
    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "E2E Pasang ajir" });
    await expect(card.getByText(/Stok dikurangi/)).toBeVisible();

    await openInventory(page);
    await expect(page.getByText("200 pcs").first()).toBeVisible();
  });

  test("biayanya muncul di Keuangan musim itu", async ({ page }) => {
    await page.goto(`/finance?season=${shedSeasonId}`);

    // 800 pcs at Rp 500 each, and the season's only spending — which is why it
    // gets a season of its own. Pointed at a season that had other outgoings,
    // this figure would be folded into a category total and the assertion
    // would be looking for a number nothing renders.
    await expect(page.getByText("Rp 400.000").first()).toBeVisible();
    await expect(page.getByText("Semua yang keluar")).toBeVisible();
  });

  /**
   * Biaya yang baru saja dibebankan ke musim ini keluar lagi sebagai harga
   * lantai. Musim ini satu-satunya di suite yang punya biaya tercatat sekaligus
   * target panen, jadi satu-satunya tempat BEP proyeksi benar-benar ada.
   */
  test("biayanya jadi patokan harga jual", async ({ page }) => {
    await page.goto(`/finance?season=${shedSeasonId}`);

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Patokan harga jual" });
    await expect(card).toBeVisible();

    // Rp 400.000 atas target 20 kg = Rp 20.000/kg, lalu 150/135/120 persennya.
    await expect(card).toContainText("Rp 20.000");
    await expect(card).toContainText("Rp 30.000");
    await expect(card).toContainText("Rp 27.000");
    await expect(card).toContainText("Rp 24.000");
  });

  /**
   * Dan yang paling menentukan: patokan itu ikut ke tempat harganya benar-benar
   * diputuskan. Kartu di Keuangan dibaca sesudah semuanya terjadi; yang menolong
   * adalah baris yang muncul saat angkanya masih setengah diketik.
   */
  test("harga yang diketik langsung ditakar di dialog jual", async ({
    page,
  }) => {
    await page.goto(`/harvest?season=${shedSeasonId}`);
    await page.getByRole("button", { name: "Catat Penjualan" }).click();

    const price = page.getByLabel("Harga Bagus per kg");
    // Diperiksa lewat toContainText, bukan getByText dengan regex: formatRupiah
    // memakai spasi tak-putus sesudah "Rp", dan regex tidak menormalkan spasi.
    const dialog = page.getByRole("dialog");

    await price.fill("35000");
    await expect(dialog).toContainText("Premium");

    await price.fill("25000");
    await expect(dialog).toContainText(
      "Lantai Minimum · Rp 1.000 di atas lantai minimum"
    );

    // Masih di atas modal, tapi di bawah lantai yang disepakati — untung, dan
    // tetap bukan harga yang boleh dilepas begitu saja.
    await price.fill("23000");
    await expect(dialog).toContainText("kurang Rp 1.000 dari lantai minimum");

    // Di bawah modal bukan sekadar tier terbawah — ini rugi, dan harus dibilang
    // begitu, bukan "untung tipis".
    await price.fill("18000");
    await expect(dialog).toContainText("Di bawah modal Rp 20.000/kg");
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
