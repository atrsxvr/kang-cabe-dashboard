import "server-only";

import { prisma } from "@/lib/prisma";
import { roundUpToCash } from "@/lib/money";
import {
  averagePrice,
  emptyWeights,
  lineTotal,
  totalOf,
  unsoldBalance,
  type ChiliGradeValue,
  type GradeWeights,
} from "@/lib/harvest";

/**
 * Season-scoped by rule, like every other operational read. A harvest total
 * folded across plantings would answer no question anyone asks.
 */

export type HarvestRow = {
  id: string;
  harvestDate: Date;
  goodKg: number;
  rejectKg: number;
  totalKg: number;
  notes: string | null;
  recordedBy: { id: string; name: string } | null;
};

export async function listHarvests(seasonId: string): Promise<HarvestRow[]> {
  const rows = await prisma.harvestLog.findMany({
    where: { seasonId },
    orderBy: [{ harvestDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      harvestDate: true,
      goodKg: true,
      rejectKg: true,
      notes: true,
      recordedBy: { select: { id: true, name: true } },
    },
  });

  return rows.map((row) => ({
    ...row,
    totalKg: row.goodKg + row.rejectKg,
  }));
}

export type SaleItemRow = {
  id: string;
  grade: ChiliGradeValue;
  weightKg: number;
  pricePerKg: number;
  total: number;
};

export type SaleRow = {
  id: string;
  soldAt: Date;
  buyerName: string;
  isPaid: boolean;
  paidAt: Date | null;
  notes: string | null;
  recordedBy: { id: string; name: string } | null;
  items: SaleItemRow[];
  totalKg: number;
  /** Jumlah persis dari barisnya, sebelum dibulatkan. */
  subtotal: number;
  /** Selisih pembulatan ke kelipatan 500. Nol kalau kebetulan sudah pas. */
  rounding: number;
  /** Yang benar-benar dibayar. Ini yang dipakai semua laporan. */
  totalAmount: number;
};

export async function listSales(seasonId: string): Promise<SaleRow[]> {
  const rows = await prisma.saleTransaction.findMany({
    where: { seasonId },
    orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      soldAt: true,
      buyerName: true,
      isPaid: true,
      paidAt: true,
      notes: true,
      recordedBy: { select: { id: true, name: true } },
      items: {
        select: { id: true, grade: true, weightKg: true, pricePerKg: true },
      },
    },
  });

  return rows.map((row) => {
    const items = row.items.map((item) => ({
      ...item,
      total: lineTotal(item.weightKg, item.pricePerKg),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalAmount = roundUpToCash(subtotal);

    return {
      ...row,
      items,
      totalKg: items.reduce((sum, item) => sum + item.weightKg, 0),
      subtotal,
      rounding: totalAmount - subtotal,
      totalAmount,
    };
  });
}

export type HarvestSummary = {
  harvested: GradeWeights;
  sold: GradeWeights;
  unsold: GradeWeights;
  totalHarvestedKg: number;
  totalSoldKg: number;
  income: number;
  /** Yang sudah masuk kantong, terpisah dari yang masih ditagih. */
  received: number;
  outstanding: number;
  outstandingCount: number;
  averagePricePerKg: number;
  lastHarvestAt: Date | null;
};

export async function harvestSummary(
  seasonId: string
): Promise<HarvestSummary> {
  const [harvests, sales] = await Promise.all([
    prisma.harvestLog.aggregate({
      where: { seasonId },
      _sum: { goodKg: true, rejectKg: true },
      _max: { harvestDate: true },
    }),
    listSales(seasonId),
  ]);

  const harvested: GradeWeights = {
    GOOD: harvests._sum.goodKg ?? 0,
    REJECT: harvests._sum.rejectKg ?? 0,
  };

  const sold = emptyWeights();
  let income = 0;
  let received = 0;
  let outstanding = 0;
  let outstandingCount = 0;

  for (const sale of sales) {
    for (const item of sale.items) sold[item.grade] += item.weightKg;

    income += sale.totalAmount;

    if (sale.isPaid) {
      received += sale.totalAmount;
    } else {
      outstanding += sale.totalAmount;
      outstandingCount += 1;
    }
  }

  const totalSoldKg = totalOf(sold);

  return {
    harvested,
    sold,
    unsold: unsoldBalance(harvested, sold),
    totalHarvestedKg: totalOf(harvested),
    totalSoldKg,
    income,
    received,
    outstanding,
    outstandingCount,
    averagePricePerKg: averagePrice(income, totalSoldKg),
    lastHarvestAt: harvests._max.harvestDate,
  };
}

/**
 * Names already used, newest first.
 *
 * Offered as suggestions rather than a buyer table: the same few pengepul come
 * back, but a one-off restaurant should not require registering anyone first.
 */
export async function buyerSuggestions(limit = 20): Promise<string[]> {
  const rows = await prisma.saleTransaction.findMany({
    distinct: ["buyerName"],
    orderBy: { soldAt: "desc" },
    take: limit,
    select: { buyerName: true },
  });

  return rows.map((row) => row.buyerName);
}
