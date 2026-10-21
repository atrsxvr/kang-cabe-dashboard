import { timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";
import { notifyTomorrowTasks } from "@/server/notifications";

/**
 * `GET /api/cron/tugas-besok` — the evening reminder of tomorrow's tasks.
 *
 * Called by Vercel Cron daily at 11.00 UTC (18.00–18.59 WIB on the Hobby
 * plan, which only promises the hour). Vercel sends `CRON_SECRET` as a bearer
 * token; anything without it is refused, so a stranger cannot make every
 * member's phone buzz. Public in `proxy.ts` because the scheduler carries no
 * session — the secret is the lock.
 */
export async function GET(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET belum diatur." }, { status: 503 });
  }

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  const result = await notifyTomorrowTasks(new Date());
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
