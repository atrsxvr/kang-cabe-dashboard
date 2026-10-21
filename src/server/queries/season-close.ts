import "server-only";

import { prisma } from "@/lib/prisma";
import type { ClosingFacts } from "@/lib/season-close";
import { seasonMaterialCost, seasonResult } from "@/server/queries/finance";
import { harvestSummary } from "@/server/queries/harvest";
import { netCapitalAsOf } from "@/server/queries/capital";
import { countUnpricedPurchases } from "@/server/queries/inventory";

/**
 * The facts the closing checklist judges, taken from the same queries the
 * pages show them from — so the checklist can never disagree with Keuangan
 * or Panen about the same season.
 *
 * Season-scoped, except the two that are not the season's to own: purchases
 * belong to the shed, and capital belongs to the members.
 */
export async function closingFacts(seasonId: string): Promise<ClosingFacts> {
  const [result, cost, summary, unpricedPurchases, unrecordedUsageTasks, capital] =
    await Promise.all([
      seasonResult(seasonId),
      seasonMaterialCost(seasonId),
      harvestSummary(seasonId),
      countUnpricedPurchases(),
      // The same count the dashboard's "Pemakaian belum dicatat" shows.
      prisma.task.count({
        where: {
          seasonId,
          status: "DONE",
          usageRecordedAt: null,
          materials: { some: {} },
        },
      }),
      netCapitalAsOf(new Date()),
    ]);

  return {
    unrecordedUsageTasks,
    unpricedUsages: cost.unpricedUsages,
    unpricedPurchases,
    unpaidSales: summary.outstandingCount,
    unpaidAmount: result.outstanding,
    unsoldKg: summary.sellableUnsoldKg,
    unsoldValue: result.unsoldValue,
    // The split is by capital, so what has to exist is capital to split by.
    capitalTotal: capital.reduce(
      (sum, holder) => sum + Math.max(0, holder.net),
      0
    ),
  };
}
