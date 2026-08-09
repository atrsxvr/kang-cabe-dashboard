import Link from "next/link";

import {
  findingStatusLabels,
  findingStatusTones,
} from "@/components/health/finding-labels";
import { SEASON_PARAM } from "@/lib/season-param";
import { cn } from "@/lib/utils";
import type { FindingStatus } from "@/server/queries/findings";

const ORDER = ["REPORTED", "DIAGNOSED", "TREATED", "RESOLVED"] as const;

export const FINDING_STATUS_PARAM = "status";

/** Reads and validates the status filter out of a page's searchParams. */
export function readStatusParam(
  searchParams: Record<string, string | string[] | undefined>
): FindingStatus | undefined {
  const raw = searchParams[FINDING_STATUS_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;

  return ORDER.includes(value as (typeof ORDER)[number])
    ? (value as FindingStatus)
    : undefined;
}

/**
 * The counts double as the filter — clicking a stage shows only that stage,
 * clicking it again clears. Plain links rather than client state, so the
 * choice survives a refresh and can be sent to whoever needs to act on it
 * ("ini yang menunggu diagnosa kamu").
 */
export function FindingStatusFilter({
  counts,
  active,
  seasonId,
  total,
}: {
  counts: Record<FindingStatus, number>;
  active?: FindingStatus;
  seasonId: string;
  total: number;
}) {
  const href = (status?: FindingStatus) => {
    const params = new URLSearchParams({ [SEASON_PARAM]: seasonId });
    if (status) params.set(FINDING_STATUS_PARAM, status);
    return `/health?${params}`;
  };

  return (
    <div className="mb-6 grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ORDER.map((status) => {
          const selected = active === status;

          return (
            <Link
              key={status}
              // Clicking the active stage clears it, so the filter never
              // becomes a trap with no visible way back.
              href={href(selected ? undefined : status)}
              aria-pressed={selected}
              className={cn(
                "focus-visible:ring-ring rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                selected
                  ? "border-foreground/30 bg-muted"
                  : "hover:bg-muted/50"
              )}
            >
              <p className="text-lg font-semibold tabular-nums">
                {counts[status]}
              </p>
              <p
                className={cn(
                  "text-xs",
                  selected
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {findingStatusLabels[status]}
              </p>
            </Link>
          );
        })}
      </div>

      {active ? (
        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs",
              findingStatusTones[active]
            )}
          >
            {findingStatusLabels[active]}
          </span>
          <span>
            {counts[active]} dari {total} temuan
          </span>
          <Link
            href={href()}
            className="text-foreground underline underline-offset-2"
          >
            Tampilkan semua
          </Link>
        </p>
      ) : null}
    </div>
  );
}
