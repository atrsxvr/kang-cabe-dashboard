import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Lahan — the garden's plots. Not season-scoped, like the shed: a plot
 * outlives every planting on it, and a season is what points at a plot.
 */

export type GardenRow = {
  id: string;
  name: string;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  bmkgAdm4: string | null;
  seasonCount: number;
};

export async function listGardens(): Promise<GardenRow[]> {
  const gardens = await prisma.garden.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      locationName: true,
      latitude: true,
      longitude: true,
      bmkgAdm4: true,
      _count: { select: { seasons: true } },
    },
  });
  return gardens.map(({ _count, ...garden }) => ({
    ...garden,
    seasonCount: _count.seasons,
  }));
}

export type GardenOption = {
  id: string;
  name: string;
  /** From the latest season on this plot — what a new one most likely uses. */
  sprayTankLitres: number;
  kocorTankLitres: number;
};

/** Default tanks for a plot nobody has planted yet. */
export const DEFAULT_TANKS = { sprayTankLitres: 16, kocorTankLitres: 20 } as const;

/**
 * For the season form: plots most recently planted first, so a new season
 * opens on the plot the last one used, with that season's tanks.
 */
export async function gardenOptions(): Promise<GardenOption[]> {
  const gardens = await prisma.garden.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      seasons: {
        orderBy: { startDate: "desc" },
        take: 1,
        select: { startDate: true, sprayTankLitres: true, kocorTankLitres: true },
      },
    },
  });

  return gardens
    .map((garden) => ({ garden, latest: garden.seasons[0] ?? null }))
    .sort((a, b) => (b.latest?.startDate.getTime() ?? 0) - (a.latest?.startDate.getTime() ?? 0))
    .map(({ garden, latest }) => ({
      id: garden.id,
      name: garden.name,
      sprayTankLitres: latest?.sprayTankLitres ?? DEFAULT_TANKS.sprayTankLitres,
      kocorTankLitres: latest?.kocorTankLitres ?? DEFAULT_TANKS.kocorTankLitres,
    }));
}
