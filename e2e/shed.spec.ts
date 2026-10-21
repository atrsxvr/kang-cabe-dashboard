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
    // Totalnya yang diketik di sini; harga per satuan diuji tersendiri.
    await page.getByRole("button", { name: "Total", exact: true }).click();
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

    // Nama persis, bukan potongan: toast "… diarsipkan." juga memuat namanya.
    // Yang diuji barisnya hilang dari daftar, bukan tidak ada teks yang
    // menyebutnya — dan toast yang masih tampil empat detik membuat versi lama
    // tes ini lolos atau gagal tergantung seberapa jauh basis datanya.
    await expect(page.getByText(MATERIAL, { exact: true })).toHaveCount(0);

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

/**
 * Harga yang salah ketik harus bisa dibetulkan dari tempat ia diketik: nilai
 * stok awal dari dialog Edit, harga belanja dari Riwayat. Bahannya sendiri,
 * supaya rata-rata harga yang diubah di sini tidak menggeser angka biaya musim
 * yang diperiksa blok di atas.
 */
test.describe.serial("harga bahan bisa dikoreksi", () => {
  const PRICED = `E2E Harga ${Date.now()}`;

  test("dialog Edit membawa isian nilai stok awal", async ({ page }) => {
    await openInventory(page);

    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(PRICED);
    await page.getByLabel("Satuan", { exact: true }).selectOption("pcs");
    await page.getByLabel("Kategori", { exact: true }).selectOption("SUPPLIES");
    await page.getByLabel("Stok Awal", { exact: true }).fill("10");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Total", exact: true }).click();
    await page.getByLabel("Nilai stok awal (Rp)", { exact: true }).fill("100000");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();
    await expect(page.getByText(PRICED, { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: `Edit ${PRICED}` }).first().click();
    // Dibuka sebagai harga per satuan: Rp 100.000 untuk 10 pcs.
    await expect(
      page.getByLabel("Harga per pcs (Rp)", { exact: true })
    ).toHaveValue("10.000");
    await page.getByRole("button", { name: "Total", exact: true }).click();
    const opening = page.getByLabel("Nilai stok awal (Rp)", { exact: true });
    await expect(opening).toHaveValue("100.000");
    // Stok awalnya sudah tertulis dalam pcs; mengganti satuan akan
    // membacanya ulang diam-diam.
    await expect(page.getByLabel("Satuan", { exact: true })).toBeDisabled();

    await opening.fill("150000");
    await page.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(page.getByText("Bahan diperbarui.")).toBeVisible();

    // Dibuka ulang dari server, bukan sisa isian tadi.
    await page.reload();
    await page.getByRole("button", { name: `Edit ${PRICED}` }).first().click();
    await page.getByRole("button", { name: "Total", exact: true }).click();
    await expect(
      page.getByLabel("Nilai stok awal (Rp)", { exact: true })
    ).toHaveValue("150.000");
  });

  test("harga per kg dihitungkan totalnya, tanpa menghitung sendiri", async ({
    page,
  }) => {
    const NPK = `E2E NPK ${Date.now()}`;
    await openInventory(page);

    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(NPK);
    await page.getByLabel("Satuan", { exact: true }).selectOption("gram");
    await page.getByLabel("Stok Awal", { exact: true }).fill("200");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("0");

    // Bawaannya per kg: harga yang disebut di toko.
    await page.getByLabel("Harga per kg (Rp)", { exact: true }).fill("25000");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Total Rp 5.000 untuk 200 gram");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();
    await expect(page.getByText(NPK, { exact: true }).first()).toBeVisible();

    // Yang tersimpan totalnya, dan bisa dibaca balik per satuan mana pun.
    await page.getByRole("button", { name: `Edit ${NPK}` }).first().click();
    await expect(
      page.getByLabel("Harga per kg (Rp)", { exact: true })
    ).toHaveValue("25.000");
    await page.getByRole("button", { name: "Per gram", exact: true }).click();
    await expect(
      page.getByLabel("Harga per gram (Rp)", { exact: true })
    ).toHaveValue("25");
    await page.getByRole("button", { name: "Total", exact: true }).click();
    await expect(
      page.getByLabel("Nilai stok awal (Rp)", { exact: true })
    ).toHaveValue("5.000");
  });

  test("belanja bisa diisi harga per ml dari pabriknya", async ({ page }) => {
    const LIQUID = `E2E Cair ${Date.now()}`;
    await openInventory(page);

    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(LIQUID);
    await page.getByLabel("Satuan", { exact: true }).selectOption("ml");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();
    await expect(page.getByText(LIQUID, { exact: true }).first()).toBeVisible();

    await page
      .getByRole("button", { name: `Tambah stok ${LIQUID}` })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Jumlah (ml)", { exact: true }).fill("250");
    await dialog.getByRole("button", { name: "Per ml", exact: true }).click();
    await dialog.getByLabel("Harga per ml (Rp)", { exact: true }).fill("150");
    await expect(dialog).toContainText("Total Rp 37.500 untuk 250 ml");
    await dialog.getByRole("button", { name: "Tambah", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    await page
      .getByRole("button", { name: `Riwayat stok ${LIQUID}` })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toContainText("Bayar Rp 37.500");
  });

  test("kategori baru bisa dipilih di form dan muncul di saringan", async ({
    page,
  }) => {
    const MITE = `E2E Akarisida ${Date.now()}`;
    await openInventory(page);

    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(MITE);
    await page.getByLabel("Satuan", { exact: true }).selectOption("ml");
    await page.getByLabel("Kategori", { exact: true }).selectOption("ACARICIDE");
    await page.getByLabel("Stok Awal", { exact: true }).fill("0");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();
    await expect(page.getByText(MITE, { exact: true }).first()).toBeVisible();

    // Saringannya cuma menawarkan kategori yang ada isinya, jadi Akarisida
    // baru muncul setelah bahan pertamanya terdaftar.
    await page
      .getByLabel("Saring berdasarkan kategori")
      .selectOption({ label: "Akarisida" });
    await expect(page.getByText(MITE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(PRICED, { exact: true })).toHaveCount(0);
  });

  test("harga belanja yang sudah terisi bisa diubah di Riwayat", async ({
    page,
  }) => {
    await openInventory(page);

    await page
      .getByRole("button", { name: `Tambah stok ${PRICED}` })
      .first()
      .click();
    await page.getByLabel("Jumlah (pcs)", { exact: true }).fill("5");
    await page.getByLabel("Total bayar (Rp)", { exact: true }).fill("50000");
    await page.getByRole("button", { name: "Tambah", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page
      .getByRole("button", { name: `Riwayat stok ${PRICED}` })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Bayar Rp 50.000");

    await dialog.getByRole("button", { name: "Ubah harga belanja" }).click();
    const input = dialog.getByLabel("Total bayar", { exact: true });
    await expect(input).toHaveValue("50.000");
    await input.fill("60000");
    await dialog.getByRole("button", { name: "Simpan" }).click();

    await expect(dialog).toContainText("Bayar Rp 60.000");
  });

  test("harga per kemasan pabrik dihitungkan untuk sisa stok", async ({
    page,
  }) => {
    const BAG = `E2E Kemasan ${Date.now()}`;
    await openInventory(page);

    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(BAG);
    await page.getByLabel("Satuan", { exact: true }).selectOption("gram");
    await page.getByLabel("Stok Awal", { exact: true }).fill("200");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("300");
    await page
      .getByLabel("Bentuk kemasan pabrik (opsional)", { exact: true })
      .fill("bungkus");
    await page
      .getByLabel("Isi per kemasan (opsional)", { exact: true })
      .fill("500");

    // Kemasan 500 g seharga Rp 30.000, sisa 200 g: 200/500 × 30.000.
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Per bungkus", exact: true }).click();
    await expect(dialog.getByLabel("Isi bungkus ini")).toHaveValue("500");
    await dialog.getByLabel("Harga per bungkus (Rp)", { exact: true }).fill("30000");
    await expect(dialog).toContainText(
      "Total Rp 12.000 untuk 200 gram · Rp 60.000/kg"
    );
    await page.getByRole("button", { name: "Simpan Bahan" }).click();
    await expect(page.getByText(BAG, { exact: true }).first()).toBeVisible();

    // 200 g, batas 300 g: satu bungkus 500 g membawanya lewat batas.
    await page.getByRole("tab", { name: /Belanja/ }).click();
    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: BAG });
    await expect(card).toContainText("beli 1 bungkus (500 gram)");

    // Belanja kali ini kemasan besar: 2 kg seharga Rp 100.000.
    await card.getByRole("button", { name: "Sudah dibeli" }).click();
    const buy = page.getByRole("dialog");
    await expect(buy.getByLabel("Jumlah (gram)", { exact: true })).toHaveValue(
      "500"
    );
    await buy.getByLabel("Jumlah (gram)", { exact: true }).fill("2000");
    await buy.getByRole("button", { name: "Per bungkus", exact: true }).click();
    await buy.getByLabel("Isi bungkus ini").fill("2000");
    await buy.getByLabel("Harga per bungkus (Rp)", { exact: true }).fill("100000");
    await expect(buy).toContainText("Total Rp 100.000 untuk 2 kg");
    await buy.getByRole("button", { name: "Tambah", exact: true }).click();
    await expect(buy).toHaveCount(0);

    // Kemasan besar tadi cuma untuk catatan itu; kemasan biasanya tetap.
    await page.getByRole("tab", { name: /Stok Bahan/ }).click();
    await page.getByRole("button", { name: `Edit ${BAG}` }).first().click();
    await expect(
      page.getByLabel("Isi per kemasan (opsional)", { exact: true })
    ).toHaveValue("500");
  });

  test("daftar belanja sampai utuh ke WhatsApp, bukan cuma judulnya", async ({
    page,
  }) => {
    // The phone's share sheet is not something a test can open, so what is
    // checked is what the app hands over to it.
    await page.addInitScript(() => {
      (window as unknown as { shared: unknown }).shared = null;
      navigator.share = async (data) => {
        (window as unknown as { shared: unknown }).shared = data;
      };
    });
    const SHORT = `E2E Habis ${Date.now()}`;
    await openInventory(page);
    await page.getByRole("button", { name: "Tambah Bahan" }).click();
    await page.getByLabel("Nama Bahan", { exact: true }).fill(SHORT);
    await page.getByLabel("Batas Minimum", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();
    await expect(page.getByText(SHORT, { exact: true }).first()).toBeVisible();

    await page.getByRole("tab", { name: /Belanja/ }).click();
    await expect(page.getByText(SHORT, { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Bagikan" }).click();
    const shared = await page.evaluate(
      () => (window as unknown as { shared: { title?: string; text: string } }).shared
    );
    // A title alongside the text is what made WhatsApp on iPhone keep only
    // the first line.
    expect(shared.title).toBeUndefined();
    expect(shared.text).toMatch(/^Daftar Belanja — /);
    expect(shared.text).toContain("\nBAHAN\n");
    expect(shared.text).toContain(`• ${SHORT} — `);

    const href = await page
      .getByRole("link", { name: "WhatsApp" })
      .getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(href!.split("text=")[1])).toBe(shared.text);
  });

  test("bahan yang sudah ada belanjanya cuma bisa diarsipkan", async ({
    page,
  }) => {
    await openInventory(page);

    // PRICED punya belanja dari tes sebelumnya: riwayat yang nyata.
    await expect(
      page.getByRole("button", { name: `Arsipkan ${PRICED}` }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Hapus ${PRICED}` })
    ).toHaveCount(0);
  });

  test("salah ketik dengan stok awal bisa dihapus, dan namanya bebas lagi", async ({
    page,
  }) => {
    const TYPO = `E2E Salah Ketik ${Date.now()}`;

    const register = async () => {
      await page.getByRole("button", { name: "Tambah Bahan" }).click();
      await page.getByLabel("Nama Bahan", { exact: true }).fill(TYPO);
      await page.getByLabel("Stok Awal", { exact: true }).fill("500");
      await page.getByLabel("Batas Minimum", { exact: true }).fill("0");
      await page.getByRole("button", { name: "Simpan Bahan" }).click();
      await expect(page.getByText(TYPO, { exact: true }).first()).toBeVisible();
    };

    await openInventory(page);
    await register();

    // Satu-satunya riwayatnya catatan stok awal, jadi tombolnya Hapus.
    await expect(
      page.getByRole("button", { name: `Arsipkan ${TYPO}` })
    ).toHaveCount(0);
    await page.getByRole("button", { name: `Hapus ${TYPO}` }).first().click();
    await page.getByRole("button", { name: "Hapus", exact: true }).click();

    await expect(page.getByText(`${TYPO} dihapus.`)).toBeVisible();
    await expect(page.getByText(TYPO, { exact: true })).toHaveCount(0);

    // Benar-benar hilang, bukan disembunyikan: nama yang unik bisa dipakai
    // lagi, dan tidak ada yang tertinggal di arsip.
    await register();
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
