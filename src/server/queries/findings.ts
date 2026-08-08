import "server-only";

import { prisma } from "@/lib/prisma";
import type { FindingStatus, Severity } from "@/generated/prisma/client";

/** Scoped by season, by rule — a finding only means anything within its crop. */

export type FindingRow = {
  id: string;
  hst: number;
  photoUrl: string | null;
  location: string | null;
  symptoms: string;
  severity: Severity;
  status: FindingStatus;
  diagnosis: string | null;
  treatment: string | null;
  diagnosedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  reportedBy: { id: string; name: string } | null;
  diagnosedBy: { id: string; name: string } | null;
};

const findingSelect = {
  id: true,
  hst: true,
  photoUrl: true,
  location: true,
  symptoms: true,
  severity: true,
  status: true,
  diagnosis: true,
  treatment: true,
  diagnosedAt: true,
  resolvedAt: true,
  createdAt: true,
  reportedBy: { select: { id: true, name: true } },
  diagnosedBy: { select: { id: true, name: true } },
} as const;

export async function listFindingsBySeason(
  seasonId: string
): Promise<FindingRow[]> {
  return prisma.healthLog.findMany({
    where: { seasonId },
    select: findingSelect,
    // Unresolved first, worst first, then newest — the agronomist's queue.
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
  });
}

export async function countFindingsByStatus(
  seasonId: string
): Promise<Record<FindingStatus, number>> {
  const grouped = await prisma.healthLog.groupBy({
    by: ["status"],
    where: { seasonId },
    _count: { _all: true },
  });

  const counts = {
    REPORTED: 0,
    DIAGNOSED: 0,
    TREATED: 0,
    RESOLVED: 0,
  } as Record<FindingStatus, number>;

  for (const row of grouped) counts[row.status] = row._count._all;
  return counts;
}
