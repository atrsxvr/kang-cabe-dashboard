"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter } from "lucide-react";

import { NativeSelect } from "@/components/common/native-select";
import { findingStatusLabels } from "@/components/health/finding-labels";
import {
  FINDING_STATUS_ORDER,
  FINDING_STATUS_PARAM,
  type FindingStatusValue,
} from "@/lib/finding-filter";

/**
 * A dropdown rather than clickable stat tiles. The tiles look exactly like the
 * dashboard's, which are not interactive, so nothing about them said "pick
 * one" — three of the four people using this are not technical, and a control
 * they have to discover by experiment is not a control.
 *
 * Deliberately carries no counts: the tiles beside it own the numbers, so the
 * same figure is not printed twice on one screen.
 */
export function FindingStatusSelect({
  active,
}: {
  active?: FindingStatusValue;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(FINDING_STATUS_PARAM, value);
    else next.delete(FINDING_STATUS_PARAM);

    router.push(next.size ? `${pathname}?${next}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <ListFilter
        className="text-muted-foreground size-4 shrink-0"
        aria-hidden
      />
      <NativeSelect
        aria-label="Saring temuan berdasarkan tahap"
        value={active ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-48"
      >
        <option value="">Semua tahap</option>
        {FINDING_STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {findingStatusLabels[status]}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
