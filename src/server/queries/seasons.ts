import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma, SeasonStatus } from "@/generated/prisma/client";

export type SeasonSummary = {
  id: string;
  name: string;
  status: string;
};

/** The season list itself is the one read that is deliberately not scoped. */
export async function listSeasons(): Promise<SeasonSummary[]> {
  return prisma.season.findMany({
    select: { id: true, name: true, status: true },
    orderBy: { startDate: "desc" },
  });
}

export type SeasonRow = {
  id: string;
  name: string;
  variety: string;
  plantCount: number;
  /** Perkiraan panen Bagus semusim. Kosong berarti panduan harga jual diam. */
  projectedHarvestKg: number | null;
  startDate: Date;
  endDate: Date | null;
  status: SeasonStatus;
  notes: string | null;
  _count: { tasks: number; harvestLogs: number };
};

/** Full rows for the Season Management table. */
export async function listSeasonRows(): Promise<SeasonRow[]> {
  return prisma.season.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { tasks: true, harvestLogs: true } } },
  });
}

export async function getSeason(seasonId: string) {
  return prisma.season.findUnique({ where: { id: seasonId } });
}

/**
 * The season the selector falls back to when the URL carries none.
 *
 * Tried in order of what someone opening the app is most likely to want to see.
 * The newest start date alone is not it: archiving a season is how this team
 * says "put that away", so a planting archived yesterday would outrank the one
 * still being picked and every page would open blank. Working backwards from
 * the season being worked right now is the whole point of a default.
 *
 * Archived stays in the list as a last resort rather than being excluded — a
 * garden whose seasons are all archived should still show its history instead
 * of the "belum ada musim tanam" screen it plainly contradicts.
 */
const DEFAULT_SEASON_ORDER: Prisma.SeasonWhereInput[] = [
  { status: "ACTIVE" },
  { status: "HARVESTING" },
  { status: { not: "ARCHIVED" } },
  {},
];

export async function getDefaultSeason(): Promise<SeasonSummary | null> {
  for (const where of DEFAULT_SEASON_ORDER) {
    const season = await prisma.season.findFirst({
      where,
      select: { id: true, name: true, status: true },
      orderBy: { startDate: "desc" },
    });

    if (season) return season;
  }

  return null;
}

/**
 * Resolves the season a page should render, given whatever the URL asked for.
 * Falls back rather than 404s: a stale bookmark should still show something.
 */
export async function resolveSeason(requestedId?: string) {
  if (requestedId) {
    const requested = await getSeason(requestedId);
    if (requested) return requested;
  }

  const fallback = await getDefaultSeason();
  return fallback ? getSeason(fallback.id) : null;
}
