import "server-only";

import { netCapital } from "@/lib/cash";
import type { CapitalHolder } from "@/lib/profit-share";
import { prisma } from "@/lib/prisma";

/**
 * Money the members put in, kept apart from money the garden earned.
 *
 * Not season-scoped, and deliberately outside FinanceTransaction: capital is
 * not income. Folding it into either would make a season look profitable on
 * the strength of its owners' own savings.
 */

export type ContributionRow = {
  id: string;
  amount: number;
  paidAt: Date;
  note: string | null;
  proofUrl: string | null;
  user: { id: string; name: string };
  season: { id: string; name: string } | null;
};

export async function listContributions(): Promise<ContributionRow[]> {
  return prisma.capitalContribution.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      amount: true,
      paidAt: true,
      note: true,
      proofUrl: true,
      user: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
    },
  });
}

export type ContributorRow = {
  id: string;
  name: string;
  /** Modal bersih: disetor dikurangi yang sudah ditarik kembali. */
  total: number;
  /** Yang sudah ditarik kembali lewat "tarik modal". */
  returned: number;
  count: number;
  /** Porsi modal, persen dari seluruh setoran. */
  capitalShare: number;
  lastPaidAt: Date | null;
};

export type CapitalSummary = {
  total: number;
  contributors: ContributorRow[];
};

/**
 * Per-member totals and each one's share of the capital — which is also
 * their share of the profit, since the margin is split by capital.
 *
 * Deactivated members are included — their money is still in the pot.
 */
export async function capitalSummary(): Promise<CapitalSummary> {
  const [grouped, returns, members] = await Promise.all([
    prisma.capitalContribution.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      _count: { _all: true },
      _max: { paidAt: true },
    }),
    prisma.memberPayout.groupBy({
      by: ["userId"],
      where: { type: "CAPITAL_RETURN" },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, deletedAt: true },
    }),
  ]);

  const byUser = new Map(grouped.map((row) => [row.userId, row]));
  const returnedBy = new Map(
    returns.map((row) => [row.userId, row._sum.amount ?? 0])
  );
  const total = grouped.reduce(
    (sum, row) =>
      sum + netCapital(row._sum.amount ?? 0, returnedBy.get(row.userId) ?? 0),
    0
  );

  const contributors: ContributorRow[] = members
    // Anyone who has put money in stays listed even after being deactivated —
    // their money is still in the pot. Anyone who never did and is inactive
    // drops off.
    .filter(
      (member) =>
        member.deletedAt === null || (byUser.get(member.id)?._sum.amount ?? 0) > 0
    )
    .map((member) => {
      const row = byUser.get(member.id);
      const returned = returnedBy.get(member.id) ?? 0;
      const amount = netCapital(row?._sum.amount ?? 0, returned);

      return {
        id: member.id,
        name: member.name,
        total: amount,
        returned,
        count: row?._count._all ?? 0,
        capitalShare: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
        lastPaidAt: row?._max.paidAt ?? null,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return { total, contributors };
}

/**
 * Each member's net capital as it stood at `cutoff`: paid in, less taken
 * back, counting only what happened on or before that moment.
 *
 * This is what a season's profit is split by. A closed season is split by the
 * capital on the day it closed, so a top-up next month cannot rewrite a split
 * that was already signed — and since every contribution and return carries
 * its date, the figure can always be recomputed rather than stored.
 *
 * Deactivated members are included: their money is still in the pot.
 */
export async function netCapitalAsOf(cutoff: Date): Promise<CapitalHolder[]> {
  const [paid, returned, members] = await Promise.all([
    prisma.capitalContribution.groupBy({
      by: ["userId"],
      where: { paidAt: { lte: cutoff } },
      _sum: { amount: true },
    }),
    prisma.memberPayout.groupBy({
      by: ["userId"],
      where: { type: "CAPITAL_RETURN", paidAt: { lte: cutoff } },
      _sum: { amount: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const paidBy = new Map(paid.map((row) => [row.userId, row._sum.amount ?? 0]));
  const returnedBy = new Map(
    returned.map((row) => [row.userId, row._sum.amount ?? 0])
  );

  return members.map((member) => ({
    id: member.id,
    name: member.name,
    net: netCapital(paidBy.get(member.id) ?? 0, returnedBy.get(member.id) ?? 0),
  }));
}
