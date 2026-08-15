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
