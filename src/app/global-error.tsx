"use client";

import { useEffect } from "react";

import { useConnectionDiagnosis } from "@/components/common/use-connection-diagnosis";
import { describeDiagnosis } from "@/lib/connection";

/**
 * Last resort: replaces the whole document when a layout fails.
 *
 * In practice this is the page people see when the database is down — the
 * dashboard layout looks up the session on every request, and that lookup
 * is the first thing to fail. So it runs the same check as `error.tsx` and
 * says where the problem is, rather than "aplikasi gagal dimuat" for every
 * cause alike.
 *
 * It renders its own document: no app stylesheet, no theme provider, no
 * components that lean on either. Colours follow the phone's own light or
 * dark setting, since the app's toggle never reaches this page.
 */
export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset: () => void;
}) {
  const { diagnosis, recheck } = useConnectionDiagnosis();
  const message = describeDiagnosis(diagnosis);
  const checking = diagnosis.where === "checking";

  useEffect(() => {
    console.error(error);
  }, [error]);

  const tryAgain = () => {
    void recheck();
    if (retry) retry();
    else {
      reset();
      // Without `retry`, re-rendering alone cannot recover a layout whose data
      // failed to load; a full reload can.
      window.location.reload();
    }
  };

  return (
    <html lang="id">
      <head>
        <title>Gangguan · Kang Cabe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          :root { color-scheme: light dark; --bg:#fff; --fg:#111; --muted:#666; --line:#ddd; --accent:#b42318; --panel:#f6f6f6; }
          @media (prefers-color-scheme: dark) {
            :root { --bg:#111; --fg:#eee; --muted:#a3a3a3; --line:#333; --accent:#f97066; --panel:#1c1c1c; }
          }
          body { margin:0; min-height:100dvh; display:grid; place-items:center; padding:1.5rem; box-sizing:border-box;
                 background:var(--bg); color:var(--fg); font-family:system-ui,-apple-system,sans-serif; }
          main { max-width:28rem; width:100%; }
          h1 { font-size:1.125rem; margin:0 0 .5rem; }
          p, li { color:var(--muted); font-size:.9rem; line-height:1.55; }
          ul { padding-left:1.1rem; margin:.75rem 0; }
          .tag { display:inline-block; font-size:.7rem; letter-spacing:.04em; text-transform:uppercase;
                 color:var(--accent); margin-bottom:.5rem; }
          .code { font-family:ui-monospace,monospace; font-size:.75rem; }
          button { margin-top:.75rem; min-height:2.5rem; padding:.5rem 1rem; border-radius:.5rem;
                   border:1px solid var(--line); background:var(--panel); color:var(--fg); font-size:.9rem; cursor:pointer; }
          button:disabled { opacity:.6; cursor:default; }
          pre { background:var(--panel); padding:.5rem; border-radius:.375rem; white-space:pre-wrap; font-size:.75rem; }
        `}</style>
      </head>
      <body>
        <main role="alert" aria-live="polite">
          <span className="tag">{checking ? "Memeriksa" : "Gangguan"}</span>
          <h1>{message.title}</h1>
          <p>{message.where}</p>

          {message.steps.length > 0 ? (
            <ul>
              {message.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}

          {error.digest ? (
            <p className="code">
              Kode: {error.digest}
              {diagnosis.where === "database" ? ` · db:${diagnosis.problem}` : ""}
            </p>
          ) : null}

          {process.env.NODE_ENV !== "production" && error.message ? (
            <details>
              <summary style={{ cursor: "pointer", fontSize: ".75rem" }}>
                Pesan asli (hanya di mode pengembangan)
              </summary>
              <pre>{error.message}</pre>
            </details>
          ) : null}

          <button onClick={tryAgain} disabled={checking}>
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
