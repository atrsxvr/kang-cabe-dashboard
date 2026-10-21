import "server-only";

import webpush, { WebPushError } from "web-push";

import { getEnv } from "@/lib/env";
import type { PushMessage } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

/**
 * Sending web push notifications.
 *
 * Optional, like photo upload: without the VAPID keys nothing is sent and
 * nothing fails — the settings card says notifications are not set up, and
 * every trigger becomes a no-op. A push that fails must never fail what
 * triggered it either; saving a finding does not depend on a phone.
 */

const env = getEnv();

export const pushConfigured = Boolean(
  env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
);

/**
 * Who the push services may contact about these messages. They accept only
 * mailto: or https:, so a local http:// address falls back to a placeholder.
 */
function vapidSubject(): string {
  if (env.VAPID_SUBJECT) return env.VAPID_SUBJECT;
  return env.BETTER_AUTH_URL.startsWith("https://")
    ? new URL(env.BETTER_AUTH_URL).origin
    : "mailto:kebun@localhost";
}

let configured = false;
function configure() {
  if (configured || !pushConfigured) return;
  webpush.setVapidDetails(
    vapidSubject(),
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export type PushResult = {
  configured: boolean;
  /** Devices it was addressed to. */
  devices: number;
  sent: number;
  /** Subscriptions the push service reported dead, and so deleted. */
  removed: number;
  failed: number;
};

/** How long a message waits for a phone that is off: until the next morning. */
const TTL_SECONDS = 12 * 60 * 60;

/**
 * Sends one message to every device of the given members. Deactivated
 * members receive nothing even if their devices are still subscribed.
 */
export async function sendPush(
  userIds: string[],
  message: PushMessage
): Promise<PushResult> {
  const result: PushResult = {
    configured: pushConfigured,
    devices: 0,
    sent: 0,
    removed: 0,
    failed: 0,
  };
  if (!pushConfigured || userIds.length === 0) return result;
  configure();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds }, user: { deletedAt: null } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  result.devices = subscriptions.length;

  const payload = JSON.stringify(message);
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
          // A push service that stops answering must not hold the evening
          // run, or a saved finding's after(), open with it.
          { TTL: TTL_SECONDS, urgency: "normal", timeout: 10_000 }
        );
        result.sent += 1;
      } catch (error) {
        // 404/410: the browser dropped the subscription — the app was
        // removed, or notifications were switched off. It will never work
        // again, so it goes.
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          await prisma.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => {});
          result.removed += 1;
        } else {
          result.failed += 1;
          console.error("[push] sending failed", error);
        }
      }
    })
  );

  return result;
}
