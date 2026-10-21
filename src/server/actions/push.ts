"use server";

import { z } from "zod";

import type { ActionResult } from "@/server/actions/result";
import { guardWrite } from "@/server/auth/guard";
import { prisma } from "@/lib/prisma";
import { pushConfigured, sendPush } from "@/server/push";

/**
 * A member's own devices. Every role may manage theirs (the `notifications`
 * area is open to all), and each action touches only the devices of whoever
 * is signed in.
 */

const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
});

/**
 * Stores this browser's subscription under whoever is signed in. The endpoint
 * is unique per browser, so a phone shared by two members follows the one
 * who switched notifications on last.
 */
export async function savePushSubscription(
  input: unknown,
  userAgent: string
): Promise<ActionResult> {
  const allowed = await guardWrite("notifications");
  if (!allowed.ok) return allowed;
  const { actor } = allowed;

  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Data langganan dari browser tidak dikenali." };
  }

  const { endpoint, keys } = parsed.data;
  const device = userAgent.slice(0, 300) || null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: actor.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: device },
    update: { userId: actor.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: device },
  });

  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const allowed = await guardWrite("notifications");
  if (!allowed.ok) return allowed;
  const { actor } = allowed;

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: String(endpoint), userId: actor.id },
  });
  return { ok: true };
}

/** Sends a test notification to every device of whoever asks. */
export async function sendTestPush(): Promise<ActionResult> {
  const allowed = await guardWrite("notifications");
  if (!allowed.ok) return allowed;
  const { actor } = allowed;

  if (!pushConfigured) {
    return { ok: false, message: "Notifikasi belum disiapkan di server." };
  }

  const result = await sendPush([actor.id], {
    title: "Notifikasi Kang Cabe aktif",
    body: "Pengingat tugas besok dan temuan baru akan muncul di sini.",
    url: "/settings",
    tag: "uji-notifikasi",
  });

  if (result.devices === 0) {
    return { ok: false, message: "Belum ada perangkat yang terdaftar atas namamu." };
  }
  if (result.sent === 0) {
    return { ok: false, message: "Gagal mengirim. Coba matikan lalu aktifkan lagi." };
  }
  return { ok: true, message: `Terkirim ke ${result.sent} perangkat.` };
}
