import { createECDH, randomBytes } from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { E2E_CRON_SECRET, FAKE_PUSH_ORIGIN } from "./push";

/**
 * Notifications, as far as a test browser can take them.
 *
 * Headless Chromium has no push service to subscribe to, and reports the
 * notification permission as "denied" whatever it was granted — checked:
 * `navigator.permissions` says "granted" in the same page. So those two
 * pieces of the browser are stubbed. Everything this app owns is real — the
 * files a phone needs to install it, the scheduler's door and its lock, and
 * the card that files this browser under the signed-in member and forgets it
 * again.
 */

const CRON = "/api/cron/tugas-besok";

type FakeDevice = {
  endpoint: string;
  p256dh: string;
  auth: string;
  /** localStorage key holding the server key it was "subscribed" with. */
  stored: string;
};

/** A subscription with real-shaped keys, at an address that cannot exist. */
function fakeDevice(): FakeDevice {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    endpoint: `${FAKE_PUSH_ORIGIN}E2E-${Date.now()}`,
    p256dh: ecdh.getPublicKey().toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
    stored: "e2e-push-subscription",
  };
}

/**
 * Runs in the page, before the app. Remembers the server key it was given in
 * localStorage, so a subscription survives a reload the way a real one does —
 * and so a test can swap the key for an old one. The permission is asked for,
 * then remembered, as on a phone.
 */
function stubBrowserPush(device: FakeDevice) {
  const permission = `${device.stored}:izin`;
  Object.defineProperty(Notification, "permission", {
    configurable: true,
    get: () => localStorage.getItem(permission) ?? "default",
  });
  Notification.requestPermission = async () => {
    localStorage.setItem(permission, "granted");
    return "granted" as const;
  };

  const fake = (serverKey: string) => ({
    endpoint: device.endpoint,
    expirationTime: null,
    options: {
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.from(atob(serverKey), (c) => c.charCodeAt(0)).buffer,
    },
    getKey: () => null,
    toJSON: () => ({
      endpoint: device.endpoint,
      expirationTime: null,
      keys: { p256dh: device.p256dh, auth: device.auth },
    }),
    unsubscribe: async () => {
      localStorage.removeItem(device.stored);
      return true;
    },
  });

  PushManager.prototype.subscribe = async function (options?: PushSubscriptionOptionsInit) {
    const key = new Uint8Array(options?.applicationServerKey as ArrayBuffer);
    const serverKey = btoa(String.fromCharCode(...key));
    localStorage.setItem(device.stored, serverKey);
    return fake(serverKey) as unknown as PushSubscription;
  };
  PushManager.prototype.getSubscription = async function () {
    const serverKey = localStorage.getItem(device.stored);
    return serverKey ? (fake(serverKey) as unknown as PushSubscription) : null;
  };
}

async function openCard(page: Page, device: FakeDevice) {
  await page.addInitScript(stubBrowserPush, device);
  await page.goto("/settings");
  return page.locator("#notifikasi");
}

test.describe("tanpa sesi", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("berkas untuk memasang aplikasi terbuka sebelum masuk", async ({ page, request }) => {
    // iOS reads these from whatever page is open when "Tambahkan ke Layar
    // Utama" is tapped — for someone not yet signed in, the login page.
    await page.goto("/masuk");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest"
    );
    const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(appleIcon).toBeTruthy();

    const manifest = await request.get("/manifest.webmanifest", { maxRedirects: 0 });
    expect(manifest.status()).toBe(200);
    const app = await manifest.json();
    expect(app).toMatchObject({
      short_name: "Kang Cabe",
      start_url: "/",
      display: "standalone",
    });

    const icons: string[] = [appleIcon!, ...app.icons.map((icon: { src: string }) => icon.src)];
    for (const src of icons) {
      const icon = await request.get(src, { maxRedirects: 0 });
      expect(icon.status(), src).toBe(200);
      expect(icon.headers()["content-type"], src).toBe("image/png");
    }

    const worker = await request.get("/sw.js", { maxRedirects: 0 });
    expect(worker.status()).toBe(200);
    expect(worker.headers()["content-type"]).toContain("javascript");
    // Never cached, or a phone keeps an old worker for as long as it likes.
    expect(worker.headers()["cache-control"]).toContain("no-cache");
    expect(await worker.text()).toContain("showNotification");
  });

  test("pintu pengingat terkunci bagi yang tidak membawa sandinya", async ({ request }) => {
    for (const authorization of [undefined, "Bearer salah", `Bearer ${E2E_CRON_SECRET}x`]) {
      const response = await request.get(CRON, {
        headers: authorization ? { authorization } : {},
        maxRedirects: 0,
      });
      // From the route itself. A redirect to /masuk would mean the proxy
      // never lets the scheduler, which carries no session, reach it.
      expect(response.status(), String(authorization)).toBe(401);
    }
  });
});

test.describe.serial("pengingat tugas besok", () => {
  const stamp = Date.now();
  const SEASON = `E2E Musim Pengingat ${stamp}`;
  // The garden's tomorrow, whatever the clock of the machine running this.
  const tomorrow = new Date(Date.now() + 7 * 3_600_000 + 86_400_000)
    .toISOString()
    .slice(0, 10);

  async function remind(request: APIRequestContext) {
    const response = await request.get(CRON, {
      headers: { authorization: `Bearer ${E2E_CRON_SECRET}` },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    return (await response.json()) as { tasks: number; configured?: boolean };
  }

  async function addTask(page: Page, title: string, status: "TODO" | "DONE") {
    await page.getByRole("button", { name: "Tambah Tugas" }).click();
    await page.getByLabel("Judul Tugas", { exact: true }).fill(title);
    await page.getByLabel("Tanggal Dikerjakan", { exact: true }).fill(tomorrow);
    await page.getByLabel("Status", { exact: true }).selectOption(status);
    await page.getByRole("button", { name: "Simpan Tugas" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(title).first()).toBeVisible();
  }

  test("menghitung tugas besok yang belum selesai, dan hanya itu", async ({ page, request }) => {
    // Counted against what is already there: locally this is the
    // development database, which may well have work due tomorrow.
    const before = await remind(request);

    await page.goto("/seasons");
    await page.getByRole("button", { name: "Tambah Musim" }).click();
    await page.getByLabel("Nama Musim", { exact: true }).fill(SEASON);
    await page.getByLabel("Varietas Benih", { exact: true }).fill("E2E Rawit");
    await page.getByLabel("Jumlah Populasi", { exact: true }).fill("100");
    await page.getByLabel("Tanggal Tanam", { exact: true }).fill("2026-01-01");
    await page.getByRole("button", { name: "Simpan Musim" }).click();
    await expect(page).toHaveURL(/season=/);
    const seasonId = new URL(page.url()).searchParams.get("season") ?? "";

    await page.goto(`/tasks?season=${seasonId}`);
    await addTask(page, `E2E Semprot besok ${stamp}`, "TODO");
    await addTask(page, `E2E Sudah dikerjakan duluan ${stamp}`, "DONE");

    const after = await remind(request);
    expect(after.tasks).toBe(before.tasks + 1);
    expect(after.configured).toBe(true);
  });
});

test.describe("kartu notifikasi di Pengaturan", () => {
  test("diaktifkan, dicoba, lalu dimatikan", async ({ page }) => {
    const card = await openCard(page, fakeDevice());
    await expect(card.getByRole("heading", { name: "Notifikasi di HP ini" })).toBeVisible();

    await card.getByRole("button", { name: "Aktifkan notifikasi" }).click();
    await expect(card.getByText("Aktif di HP ini.", { exact: true })).toBeVisible();

    // Still on after a reload: the browser is asked again, not a cookie.
    await page.reload();
    await expect(card.getByText("Aktif di HP ini.", { exact: true })).toBeVisible();

    // The server finds this device under the signed-in member. Its address is
    // made up, so the push itself cannot go anywhere: "gagal mengirim" is the
    // answer that proves the lookup worked, where "belum ada perangkat" would
    // mean the subscription was never stored.
    await card.getByRole("button", { name: "Kirim notifikasi uji" }).click();
    await expect(
      page.getByText("Gagal mengirim. Coba matikan lalu aktifkan lagi.")
    ).toBeVisible();

    await card.getByRole("button", { name: "Matikan" }).click();
    await expect(card.getByRole("button", { name: "Aktifkan notifikasi" })).toBeVisible();
  });

  test("langganan dari kunci lama dibuang, supaya bisa diaktifkan ulang", async ({ page }) => {
    const device = fakeDevice();
    const card = await openCard(page, device);
    await card.getByRole("button", { name: "Aktifkan notifikasi" }).click();
    await expect(card.getByText("Aktif di HP ini.", { exact: true })).toBeVisible();

    // As if the server's keys were replaced after this phone subscribed.
    await page.evaluate((key) => localStorage.setItem(key, btoa("kunci-lama")), device.stored);
    await page.reload();

    await expect(card.getByRole("button", { name: "Aktifkan notifikasi" })).toBeVisible();
    await expect(card.getByText("Aktif di HP ini.", { exact: true })).toHaveCount(0);
  });

  test.describe("di iPhone yang belum memasang aplikasinya", () => {
    test.use({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    });

    test("diberi petunjuk memasang, bukan tombol yang tidak akan jalan", async ({ page }) => {
      await page.goto("/settings");
      const card = page.locator("#notifikasi");

      await expect(card).toContainText("Tambahkan ke Layar Utama");
      await expect(card.getByRole("button")).toHaveCount(0);
    });
  });
});
