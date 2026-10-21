"use client";

import { useCallback, useEffect, useState } from "react";

import type { Diagnosis, HealthReport } from "@/lib/connection";

/** Past this the server is treated as not answering at all. */
const HEALTH_TIMEOUT_MS = 8000;

async function diagnose(): Promise<Diagnosis> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { where: "offline" };
  }

  let response: Response;
  try {
    response = await fetch("/api/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
  } catch {
    // The request never got an answer. `onLine` can claim a connection a
    // captive portal or a dead cell tower is not actually providing, so it is
    // asked again rather than trusted from the first check.
    return navigator.onLine ? { where: "server-unreachable" } : { where: "offline" };
  }

  // 503 is the health check reporting a database problem, with a body that
  // says which. Anything else non-2xx is the server itself failing.
  if (!response.ok && response.status !== 503) {
    return { where: "server-error", status: response.status };
  }

  try {
    const report = (await response.json()) as HealthReport;
    if (!report.database.ok) {
      return { where: "database", problem: report.database.problem };
    }
    return { where: "app" };
  } catch {
    return { where: "server-error", status: response.status };
  }
}

/**
 * Works out, from the browser, where a failure is: this phone, the server,
 * or the database. Runs once on mount, again whenever the phone comes back
 * online, and on demand.
 */
export function useConnectionDiagnosis() {
  const [diagnosis, setDiagnosis] = useState<Diagnosis>({ where: "checking" });

  const run = useCallback(async () => {
    setDiagnosis({ where: "checking" });
    setDiagnosis(await diagnose());
  }, []);

  useEffect(() => {
    let cancelled = false;
    diagnose().then((result) => {
      if (!cancelled) setDiagnosis(result);
    });

    const onOnline = () => void run();
    const onOffline = () => setDiagnosis({ where: "offline" });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [run]);

  return { diagnosis, recheck: run };
}
