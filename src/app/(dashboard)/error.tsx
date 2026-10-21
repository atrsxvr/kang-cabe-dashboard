"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CloudOff,
  Database,
  Loader2,
  RefreshCw,
  ServerCrash,
  TriangleAlert,
  WifiOff,
} from "lucide-react";

import { useConnectionDiagnosis } from "@/components/common/use-connection-diagnosis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { describeDiagnosis, type Diagnosis } from "@/lib/connection";

const icons: Record<Diagnosis["where"], typeof WifiOff> = {
  checking: Loader2,
  offline: WifiOff,
  "server-unreachable": CloudOff,
  "server-error": ServerCrash,
  database: Database,
  app: TriangleAlert,
};

/**
 * Catches failures in the pages under the dashboard shell, and says where
 * they are.
 *
 * Production hides the server's error from the browser, so this does not
 * guess from it: it checks the phone's connection, then asks `/api/health`
 * whether the server and the database answer. The sidebar stays usable
 * because this boundary sits below it.
 *
 * A failure in the layout itself — most often the session lookup, when the
 * database is down — skips this file and lands in `global-error.tsx`, which
 * runs the same check.
 */
export default function DashboardError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders. `reset` alone only re-renders, which cannot
   *  recover from data that failed to load. */
  retry?: () => void;
  reset: () => void;
}) {
  const { diagnosis, recheck } = useConnectionDiagnosis();
  const message = describeDiagnosis(diagnosis);
  const Icon = icons[diagnosis.where];
  const checking = diagnosis.where === "checking";

  useEffect(() => {
    console.error(error);
  }, [error]);

  const tryAgain = useCallback(() => {
    void recheck();
    (retry ?? reset)();
  }, [recheck, retry, reset]);

  // A connection problem that clears up — the phone back on signal, the
  // database awake again — retries the page by itself, once. Only after one
  // was seen: "app" on the first check means the page itself is broken, and
  // retrying that automatically would only loop.
  const sawConnectionProblem = useRef(false);
  useEffect(() => {
    if (
      diagnosis.where === "offline" ||
      diagnosis.where === "server-unreachable" ||
      diagnosis.where === "database"
    ) {
      sawConnectionProblem.current = true;
    } else if (diagnosis.where === "app" && sawConnectionProblem.current) {
      sawConnectionProblem.current = false;
      (retry ?? reset)();
    }
  }, [diagnosis, retry, reset]);

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-start gap-4 py-8 sm:flex-row">
        <div
          className={
            checking
              ? "bg-muted rounded-lg p-3"
              : "bg-destructive/10 rounded-lg p-3"
          }
        >
          <Icon
            className={
              checking
                ? "text-muted-foreground size-6 animate-spin"
                : "text-destructive size-6"
            }
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1" role="alert" aria-live="polite">
          <h2 className="font-medium">{message.title}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{message.where}</p>

          {message.steps.length > 0 ? (
            <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-4 text-sm">
              {message.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}

          {error.digest ? (
            <p className="text-muted-foreground mt-3 font-mono text-xs">
              Kode: {error.digest}
              {diagnosis.where === "database"
                ? ` · db:${diagnosis.problem}`
                : ""}
            </p>
          ) : null}

          {/* Development only: production replaces this with a generic line,
              and the digest above is what matches the server log there. */}
          {process.env.NODE_ENV !== "production" && error.message ? (
            <details className="mt-2 text-xs">
              <summary className="text-muted-foreground cursor-pointer">
                Pesan asli (hanya di mode pengembangan)
              </summary>
              <pre className="bg-muted mt-1 overflow-x-auto rounded p-2 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          ) : null}

          <Button
            onClick={tryAgain}
            className="mt-4"
            size="sm"
            disabled={checking}
          >
            <RefreshCw className="size-4" aria-hidden />
            Coba lagi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
