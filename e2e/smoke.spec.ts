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
