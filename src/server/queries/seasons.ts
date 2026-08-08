import "server-only";

import { prisma } from "@/lib/prisma";

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

export async function getSeason(seasonId: string) {
  return prisma.season.findUnique({ where: { id: seasonId } });
}

/** The season the selector defaults to when none is chosen yet. */
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
