import { expect, test } from "@playwright/test";

/**
 * What shows while the app is not ready yet: the green splash on opening it,
 * and the thin bar along the top while moving between pages.
 */

test("layar pembuka tampil saat aplikasi dibuka, lalu pergi sendiri", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "commit" });
  // In the first HTML, before any JavaScript has run.
  await expect(page.locator(".app-splash")).toHaveCount(1);
  await expect(page.locator(".app-splash")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pengaturan & Anggota" })).toBeVisible();
});

test("bar tipis berjalan selama perpindahan halaman, lalu hilang", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator(".app-splash")).toHaveCount(0);

  // Held back on purpose, so the wait the bar is for can be seen.
  await page.route("**/inventory**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });

  await page.getByRole("button", { name: "Buka menu" }).click();
  await page.getByRole("link", { name: /Inventaris/ }).first().click();

  await expect(page.locator("[data-running]")).toBeVisible();
  await expect(page).toHaveURL(/\/inventory/);
  await expect(page.locator("[data-running]")).toHaveCount(0);
  await expect(page.locator(".nav-progress-grow")).toHaveCount(0);
});
