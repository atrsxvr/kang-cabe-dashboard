"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEASON_PARAM } from "@/lib/season-param";
import type { SeasonSummary } from "@/server/queries/seasons";

const statusLabel: Record<string, string> = {
  PLANNING: "Perencanaan",
  ACTIVE: "Berjalan",
  HARVESTING: "Panen",
  COMPLETED: "Selesai",
  ARCHIVED: "Arsip",
};

export function SeasonSelector({
  seasons,
  defaultSeasonId,
}: {
  seasons: SeasonSummary[];
  /**
   * Used when the URL carries no season yet. Resolved on the server so the
   * first paint already names the right one — layouts cannot read
   * searchParams, so the selection itself is read from the client.
   */
  defaultSeasonId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (seasons.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">Belum ada musim</span>
    );
  }

  const selectedId =
    searchParams.get(SEASON_PARAM) ?? defaultSeasonId ?? seasons[0].id;

  const onChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(SEASON_PARAM, value);
    router.push(`${pathname}?${next}`);
  };

  return (
    <Select value={selectedId} onValueChange={onChange}>
      <SelectTrigger className="w-47.5 sm:w-60" aria-label="Pilih musim tanam">
        <SelectValue placeholder="Pilih musim" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((season) => (
          <SelectItem key={season.id} value={season.id}>
            <span className="truncate">{season.name}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {statusLabel[season.status] ?? season.status}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
