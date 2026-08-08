import "server-only";

import { prisma } from "@/lib/prisma";
import type { SeasonStatus } from "@/generated/prisma/client";

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

/** The season the selector falls back to when the URL carries none. */
export async function getDefaultSeason(): Promise<SeasonSummary | null> {
  const active = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, status: true },
    orderBy: { startDate: "desc" },
  });

  if (active) return active;

  return prisma.season.findFirst({
    select: { id: true, name: true, status: true },
    orderBy: { startDate: "desc" },
  });
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
