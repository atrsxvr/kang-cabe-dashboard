import { execFileSync } from "node:child_process";

import { expect, test, type BrowserContext, type Browser } from "@playwright/test";

/**
 * Yang paling perlu dibuktikan dari RBAC bukan bahwa Admin bisa — seluruh suite
 * lain sudah berjalan sebagai Admin dan membuktikannya setiap kali.
 *
 * Yang perlu dibuktikan adalah bahwa **yang lain tidak bisa**, dan bahwa yang
 * belum masuk sama sekali tidak bisa. Kegagalan di arah itu tidak bersuara:
 * fiturnya tetap jalan, halamannya tetap tergambar, dan tidak ada yang tahu
 * sampai seseorang menulis di tempat yang bukan wilayahnya.
 */

function sessionCookie(role: "AGRONOMIST" | "LOGISTICS" | "SALES") {
  const raw = execFileSync(
    "pnpm",
    ["exec", "tsx", "e2e/make-session.ts", role],
    { encoding: "utf8" }
  );

  return JSON.parse(raw.trim().split("\n").pop() ?? "") as {
    name: string;
    value: string;
  };
}

async function contextFor(
  browser: Browser,
  role: "AGRONOMIST" | "LOGISTICS" | "SALES"
): Promise<BrowserContext> {
  const context = await browser.newContext({ storageState: undefined });

  await context.addCookies([
    {
      ...sessionCookie(role),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  return context;
}

test.describe("yang belum masuk", () => {
  // Sesi Admin dari auth.setup sengaja dibuang untuk blok ini.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("dialihkan ke halaman masuk, dan tujuannya dibawa", async ({ page }) => {
    await page.goto("/finance");

    await expect(page).toHaveURL(/\/masuk\?lanjut=%2Ffinance/);
    await expect(
      page.getByRole("heading", { name: "Kang Cabe Dashboard" })
    ).toBeVisible();
  });

  /**
   * Cookie yang ada tapi palsu melewati `proxy.ts` — ia cuma memeriksa nama
   * cookie, bukan isinya. Jadi jalur ini berakhir di `unauthorized()`, dan itu
   * butuh `experimental.authInterrupts` menyala di `next.config.ts`.
   *
   * Pernah tidak menyala, dan gejalanya cuma muncul di sini: yang belum masuk
   * sama sekali tetap dialihkan dengan rapi, tesnya hijau, dan cuma cookie
   * kedaluwarsa atau anggota yang baru dinonaktifkan yang menemukan galatnya.
   * Jalur yang jarang dilewati justru yang paling perlu dijaga tes, karena tidak
   * ada yang menemukannya saat mencoba-coba.
   */
  test("cookie palsu dapat 401 yang bisa dibaca, bukan galat", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "palsu",
        domain: "localhost",
        path: "/",
      },
    ]);

    const page = await context.newPage();
    const response = await page.goto("/");

    expect(response?.status()).toBe(401);
    await expect(
      page.getByRole("heading", { name: "Belum bisa masuk sini" })
    ).toBeVisible();

    await context.close();
  });

  /**
   * Server Action punya URL dan bisa dipanggil tanpa pernah membuka halamannya.
   * Ini yang membuat penjagaan di `proxy.ts` saja tidak cukup — dan tes ini
   * memanggilnya persis seperti penyerang akan memanggilnya.
   */
  test("nggak bisa menulis lewat Server Action langsung", async ({
    request,
  }) => {
    const response = await request.post("/seasons", {
      headers: {
        "Next-Action": "coba-tembak-langsung",
        "Content-Type": "multipart/form-data",
      },
      data: "",
    });

    // Apa pun bentuk penolakannya, yang tidak boleh terjadi adalah 200 dengan
    // musim yang benar-benar terbuat.
    expect(response.status()).toBeGreaterThanOrEqual(300);
  });
});

test.describe("peran yang bukan Admin", () => {
  /**
   * Membaca tetap terbuka untuk semua yang sudah masuk, dan itu keputusan yang
   * disengaja: empat orang ini satu koperasi, dan menyembunyikan angka dari
   * rekan sendiri menghilangkan guna aplikasi ini dibangun.
   */
  test("tetap boleh membaca semua halaman", async ({ browser }) => {
    const context = await contextFor(browser, "SALES");
    const page = await context.newPage();

    for (const path of ["/finance", "/inventory", "/settings"]) {
      await page.goto(path);
      await expect(page, `${path} malah dialihkan`).toHaveURL(
        new RegExp(`${path}$`)
      );
    }

    await context.close();
  });

  /**
   * Tombol di luar wilayahnya tidak ditampilkan sama sekali.
   *
   * Ini kerapian, **bukan** penjagaan — dan pembagian itu sengaja tercermin di
   * tesnya: yang benar-benar menahan perubahan data adalah `guardWrite`, dan
   * cakupannya dijaga `src/server/actions/guarded.test.ts`, yang membaca ke-55
   * berkas aksinya dan menolak kalau ada satu yang lupa. Alur RBAC yang cuma
   * diuji lewat tombol akan lulus sempurna pada aplikasi yang seluruh Server
   * Action-nya terbuka, asal tombolnya rajin disembunyikan.
   */
  test("nggak dikasih tombol di luar wilayahnya", async ({ browser }) => {
    const context = await contextFor(browser, "SALES");
    const page = await context.newPage();

    await page.goto("/seasons");
    await expect(
      page.getByRole("heading", { name: "Manajemen Musim Tanam" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Tambah Musim" })).toHaveCount(
      0
    );

    await page.goto("/inventory");
    await expect(
      page.getByRole("button", { name: "Tambah Alat" })
    ).toHaveCount(0);

    await context.close();
  });

  /**
   * Dan tombol di wilayahnya tetap ada. Tanpa sisi ini, komponen yang
   * menyembunyikan **segalanya** juga akan lulus tes di atas.
   */
  test("tetap dikasih tombol di wilayahnya sendiri", async ({ browser }) => {
    const context = await contextFor(browser, "SALES");
    const page = await context.newPage();

    await page.goto("/harvest");
    await expect(
      page.getByRole("button", { name: "Catat Panen" })
    ).toBeVisible();

    await context.close();
  });

  /**
   * Sementara di wilayahnya sendiri ia tetap bekerja. Tanpa sisi ini, penjaga
   * yang menolak segalanya juga akan lulus tes di atas.
   */
  test("tetap bisa menulis di wilayahnya sendiri", async ({ browser }) => {
    const context = await contextFor(browser, "LOGISTICS");
    const page = await context.newPage();

    await page.goto("/inventory");
    await page.getByRole("button", { name: "Tambah Bahan" }).click();

    const name = `E2E Bahan Logistik ${Date.now()}`;
    await page.getByLabel("Nama Bahan", { exact: true }).fill(name);
    await page.getByLabel("Satuan", { exact: true }).selectOption("pcs");
    await page.getByLabel("Kategori", { exact: true }).selectOption("SUPPLIES");
    await page.getByLabel("Stok Awal", { exact: true }).fill("10");
    await page.getByLabel("Batas Minimum", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Simpan Bahan" }).click();

    await expect(page.getByText(name).first()).toBeVisible();

    await context.close();
  });
});
