"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SeasonSummary } from "@/server/queries/seasons";

const statusLabel: Record<string, string> = {
  PLANNING: "Perencanaan",
  ACTIVE: "Berjalan",
  HARVESTING: "Panen",
  COMPLETED: "Selesai",
  ARCHIVED: "Arsip",
};

/**
 * Sprint 1: the pick is presentational only — nothing filters on it yet.
 * Wire it to the URL when the first season-scoped module lands.
 */
export function SeasonSelector({ seasons }: { seasons: SeasonSummary[] }) {
  const [value, setValue] = useState(seasons[0]?.id ?? "");

  if (seasons.length === 0) {
    return (
      <span className="text-muted-foreground text-sm">Belum ada musim</span>
    );
  }

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger
        className="w-47.5 sm:w-60"
        aria-label="Pilih musim tanam"
      >
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
