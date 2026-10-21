import { checkHealth } from "@/server/health";

/**
 * `GET /api/health` — is the server up, and can it reach the database?
 *
 * What the error pages ask to say where a failure is. Public on purpose: when
 * the database is down, checking a session is itself impossible, so a guarded
 * endpoint would answer "masuk dulu" at exactly the moment it is needed. It
 * reveals only a category ("paused", "busy"…) and a round-trip time.
 */
export async function GET() {
  const report = await checkHealth();

  return Response.json(report, {
    // 503 when the database is down, so a monitor pointed here sees it too.
    status: report.database.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
