import { expect, test } from "@playwright/test";

/**
 * What the error pages lean on to say where a failure is.
 *
 * The database-down page itself needs a server started against a database
 * that is not there, which this suite's single server cannot be; it was
 * checked by hand that way. What can be checked here is the health endpoint
 * those pages call, and the offline notice.
 */

test("pemeriksaan kesehatan terbuka tanpa sesi dan tidak membocorkan galat", async ({
  playwright,
}) => {
  // No cookie at all: when the database is down, no session can be checked,
  // and this endpoint is what has to answer then.
  const anonymous = await playwright.request.newContext({
    baseURL: test.info().project.use.baseURL,
    storageState: { cookies: [], origins: [] },
  });

  const response = await anonymous.get("/api/health", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");

  const report = await response.json();
  expect(report).toEqual({
    server: "ok",
    database: { ok: true, ms: expect.any(Number) },
  });

  await anonymous.dispose();
});

test("HP yang kehilangan sinyal diberi tahu sebelum menyimpan apa pun", async ({
  page,
  context,
}) => {
  await page.goto("/inventory");
  const notice = page.getByRole("status").filter({ hasText: "offline" });
  await expect(notice).toHaveCount(0);

  await context.setOffline(true);
  await expect(notice).toBeVisible();

  // Back on signal, it goes away by itself.
  await context.setOffline(false);
  await expect(notice).toHaveCount(0);
});
