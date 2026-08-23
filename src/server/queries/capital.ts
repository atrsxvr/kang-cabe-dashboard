import "server-only";

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
  total: number;
  count: number;
  /** Porsi modal, persen dari seluruh setoran. */
  capitalShare: number;
  /** Porsi bagi hasil yang disepakati, buat dibandingkan. */
  profitShare: number;
  lastPaidAt: Date | null;
};

export type CapitalSummary = {
  total: number;
  contributors: ContributorRow[];
};

/**
 * Per-member totals, with each one's share of the capital next to the share of
 * the profit they agreed to.
 *
 * The two are shown side by side and never reconciled automatically. Putting
 * in more money and taking a smaller cut is a perfectly reasonable thing for
 * four friends to agree; what is not reasonable is nobody noticing.
 *
 * Deactivated members are included — their money is still in the pot.
 */
export async function capitalSummary(): Promise<CapitalSummary> {
  const [grouped, members] = await Promise.all([
    prisma.capitalContribution.groupBy({
      by: ["userId"],
      _sum: { amount: true },
      _count: { _all: true },
      _max: { paidAt: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, profitShare: true, deletedAt: true },
    }),
  ]);

  const byUser = new Map(grouped.map((row) => [row.userId, row]));
  const total = grouped.reduce((sum, row) => sum + (row._sum.amount ?? 0), 0);

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
      const amount = row?._sum.amount ?? 0;

      return {
        id: member.id,
        name: member.name,
        total: amount,
        count: row?._count._all ?? 0,
        capitalShare: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
        profitShare: member.profitShare,
        lastPaidAt: row?._max.paidAt ?? null,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return { total, contributors };
}
