import { findingStatusLabels } from "@/components/health/finding-labels";
import {
  FINDING_STATUS_ORDER,
  type FindingStatusValue,
} from "@/lib/finding-filter";
import { cn } from "@/lib/utils";

/**
 * Read-only, on purpose. These were links before, and looking identical to the
 * dashboard's stat tiles meant nobody knew that. Filtering now lives in a
 * dropdown; these keep answering "how many are at each stage" — including the
 * stages currently hidden by the filter, which is the whole point of leaving
 * them unfiltered.
 *
 * No hover or cursor affordance: the tiles must not look interactive again.
 */
export function FindingStatusBoxes({
  counts,
  active,
}: {
  counts: Record<FindingStatusValue, number>;
  active?: FindingStatusValue;
}) {
  return (
    <div className="mb-6 grid grid-cols-4 gap-2 sm:gap-3">
      {FINDING_STATUS_ORDER.map((status) => {
        const selected = active === status;

        return (
          <div
            key={status}
            // Quiet outline only. Without it the list shrinks while every tile
            // still shows its full count, which reads as a bug rather than a
            // filter.
            className={cn(
              "rounded-lg border px-2 py-1.5 sm:px-3 sm:py-2",
              selected && "border-foreground/40 bg-muted",
            )}
          >
            <p className="text-base font-semibold tabular-nums sm:text-lg">
              {counts[status]}
            </p>
            <p
              className={cn(
                "text-[11px] leading-tight sm:text-xs",
                selected
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {findingStatusLabels[status]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
