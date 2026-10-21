import "server-only";

import { classifyDbError, type HealthReport } from "@/lib/connection";
import { prisma } from "@/lib/prisma";

/** Long enough for a cold pooler connection, short enough to beat the user. */
const DB_TIMEOUT_MS = 5000;

/**
 * Asks the database the smallest question there is.
 *
 * Only the category of a failure leaves this function, never its message:
 * the endpoint that serves it is open to anyone, and a raw driver error can
 * carry a host name or a user name.
 */
export async function checkHealth(): Promise<HealthReport> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("health check timed out")),
          DB_TIMEOUT_MS
        );
      }),
    ]);
    return { server: "ok", database: { ok: true, ms: Date.now() - started } };
  } catch (error) {
    // Logged in full here, where only the server's own log can see it.
    console.error("[health] database check failed", error);
    return {
      server: "ok",
      database: { ok: false, problem: classifyDbError(error) },
    };
  } finally {
    clearTimeout(timer);
  }
}
