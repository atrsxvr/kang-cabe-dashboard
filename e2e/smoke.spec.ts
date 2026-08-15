import { expect, test } from "@playwright/test";

/**
 * Every page, on a phone-sized screen, with nothing shouting in the console.
 *
 * Cheap, but it has teeth: a stale Prisma client, a layout that throws past
 * its error boundary, and a client component missing an import have all taken
 * a page down in this project without a single unit test noticing.
 */
const pages = [
  { path: "/", heading: "Dashboard Overview" },
  { path: "/seasons", heading: "Manajemen Musim" },
  { path: "/tasks", heading: "Jadwal & Tugas" },
  { path: "/health", heading: "Kesehatan" },
  { path: "/inventory", heading: "Inventaris & Alat" },
  { path: "/finance", heading: "Keuangan & Kas" },
  { path: "/harvest", heading: "Panen" },
  { path: "/settings", heading: "Settings" },
];

for (const { path, heading } of pages) {
  test(`${path} terbuka tanpa error`, async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));

    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: new RegExp(heading, "i") }).first()
    ).toBeVisible();

    expect(problems).toEqual([]);
  });
}

test("tidak melebar horizontal di layar ponsel", async ({ page }) => {
  for (const { path } of pages) {
    await page.goto(path);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );

    expect(overflows, `${path} melebar horizontal`).toBe(false);
  }
});

test("overview memuat panel yang dipakai tiap hari", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");

  // Each of these is a queue or a decision that stalls quietly somewhere
  // else in the app; the dashboard is where they are supposed to surface.
  await expect(main.getByText("Dikerjakan hari ini")).toBeVisible();
  await expect(main.getByText("Nunggu diurus")).toBeVisible();
  await expect(main.getByText("Temuan nunggu didiagnosa")).toBeVisible();
  await expect(main.getByText("Pemakaian belum dicatat")).toBeVisible();
  await expect(main.getByText("Tagihan belum dibayar")).toBeVisible();
  await expect(main.getByText("Panen 7 hari terakhir")).toBeVisible();
  await expect(main.getByText("Stok cukup buat berapa kali")).toBeVisible();
  await expect(main.getByText("Cuaca Kebun")).toBeVisible();

  // The harvest-hold panel is always present, in one state or the other.
  await expect(
    main.getByText(/Aman dipanen|Jangan panen dulu/)
  ).toBeVisible();
});

/**
 * A narrower phone than the suite's default, because the default hid a real
 * bug: five tabs on Keuangan needed 480px and ran off every screen, while the
 * page-level overflow check stayed green — a flex row that spills inside a
 * `min-w-0` parent never widens the document.
 */
test.describe("layar 360px", () => {
  test.use({ viewport: { width: 360, height: 900 } });

  test("semua tab tetap bisa dijangkau", async ({ page }) => {
    for (const { path } of pages) {
      await page.goto(path);

      const problem = await page.evaluate(() => {
        const list = document.querySelector<HTMLElement>(
          '[data-slot="tabs-list"]'
        );
        if (!list) return null;

        const rect = list.getBoundingClientRect();
        // The box itself must sit inside the screen…
        if (rect.right > window.innerWidth + 1) return "kotaknya keluar layar";

        // …and when its tabs need more room than that, the overflow has to be
        // scrollable rather than clipped, or the last tab is simply gone.
        const overflows = list.scrollWidth > list.clientWidth + 1;
        const overflowX = getComputedStyle(list).overflowX;

        return overflows && !["auto", "scroll"].includes(overflowX)
          ? "tab terpotong tanpa bisa digeser"
          : null;
      });

      expect(problem, `${path}: ${problem}`).toBeNull();
    }
  });

  /**
   * Icon-only buttons sit shoulder to shoulder with ones that archive a row.
   * A 24px target with two pixels of clearance is a mis-tap, and this is an
   * app used one-handed in a garden.
   */
  test("tombol ikon cukup besar buat jempol", async ({ page }) => {
    for (const path of ["/inventory", "/harvest", "/finance", "/tasks"]) {
      await page.goto(path);

      const tiny = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll<HTMLElement>("button").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          // Icon-only: no text to widen the target.
          if ((el.textContent ?? "").trim().length > 0) return;
          if (rect.width >= 32 && rect.height >= 32) return;

          out.push(
            `${Math.round(rect.width)}x${Math.round(rect.height)} ${el.getAttribute("aria-label") ?? ""}`
          );
        });
        return [...new Set(out)];
      });

      expect(tiny, `tombol ikon kekecilan di ${path}`).toEqual([]);
    }
  });

  /**
   * The other half of the same mistake, and the one that got made: a labelled
   * button squeezed into a square. Enlarging tap targets by reaching for the
   * `icon` size works only where there is no text — forced onto a button that
   * says "Edit", it crushes the word instead.
   */
  test("tidak ada tombol yang tulisannya terjepit", async ({ page }) => {
    for (const path of ["/seasons", "/health", "/health/racikan", "/tasks", "/inventory", "/harvest", "/finance", "/settings"]) {
      await page.goto(path);

      const squeezed = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0) return;
          if (el.scrollWidth <= el.clientWidth + 1) return;

          out.push(
            `${(el.textContent ?? "").trim().slice(0, 24)} ${el.scrollWidth}>${el.clientWidth}`
          );
        });
        return [...new Set(out)];
      });

      expect(squeezed, `tulisan terjepit di ${path}`).toEqual([]);
    }
  });
});
