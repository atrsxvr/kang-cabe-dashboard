import { connection } from "next/server";
import { CloudOff } from "lucide-react";

import { SeasonSelector } from "@/components/seasons/season-selector";
import { listSeasons } from "@/server/queries/seasons";

/**
 * Reads the season list at request time.
 *
 * Both pieces are needed. `connection()` stops prerendering, so the query is
 * not evaluated at build time and frozen into the output; <Suspense> in the
 * layout then keeps the rest of the shell static while this streams in.
 */
export async function SeasonSelectorLoader() {
  await connection();

  // This renders inside the layout, and a layout's own throw escapes its
  // error.tsx and lands on global-error — which would blank the entire shell
  // over a dropped connection. Degrade just this control instead.
  //
  // The catch is attached to the promise rather than wrapping the JSX, so a
  // render error inside SeasonSelector still reaches a real error boundary.
  const seasons = await listSeasons().catch((error: unknown) => {
    console.error("Gagal memuat daftar musim:", error);
    return null;
  });

  if (!seasons) return <SeasonSelectorUnavailable />;

  return <SeasonSelector seasons={seasons} />;
}

function SeasonSelectorUnavailable() {
  return (
    <span
      className="text-muted-foreground flex items-center gap-2 text-sm"
      role="status"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden />
      Musim tidak tersedia
    </span>
  );
}

export function SeasonSelectorSkeleton() {
  return (
    <div
      className="bg-muted h-9 w-47.5 animate-pulse rounded-md sm:w-60"
      aria-hidden
    />
  );
}
