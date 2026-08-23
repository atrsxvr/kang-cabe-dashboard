import "server-only";

import { prisma } from "@/lib/prisma";
import { calculateHst, formatDate } from "@/lib/hst";
import { roundUpToCash } from "@/lib/money";
import {
  actualPlantCount,
  averagePrice,
  emptyWeights,
  gradeOutRate,
  mortalityRate,
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
  /** Busuk atau tercecer setelah dipetik. */
  lost: GradeWeights;
  /** Dipetik, dikurangi terjual dan susut. */
  unsold: GradeWeights;
  totalHarvestedKg: number;
  totalSoldKg: number;

  /**
   * Angka "layak jual" — hanya mutu Bagus.
   *
   * Afkir sampai sekarang belum pernah terjual, jadi menilainya di harga pokok
   * yang sama akan menaruh rupiah pada sesuatu yang belum terbukti punya
   * nilai. Kilonya tetap dilaporkan; nilainya tidak.
   */
  sellableHarvestedKg: number;
  sellableSoldKg: number;
  sellableUnsoldKg: number;
  /** Porsi panen yang lolos sortir. */
  gradeOutRate: number | null;

  income: number;
  /** Dari mutu Bagus — ini yang dipakai menghitung harga jual rata-rata. */
  sellableIncome: number;
  /** Dari Afkir. Bonus, bukan target. */
  rejectIncome: number;
  /** Yang sudah masuk kantong, terpisah dari yang masih ditagih. */
  received: number;
  outstanding: number;
  outstandingCount: number;
  /** Rupiah per kilo Bagus yang terjual. */
  averagePricePerKg: number;
  lastHarvestAt: Date | null;

  /** Populasi tanam awal. */
  plantedCount: number;
  diedCount: number;
  replantedCount: number;
  actualPlantCount: number;
  mortalityRate: number | null;
  /** Berapa kali petik tercatat, bukan berapa kilo. */
  sessionCount: number;
  /** Rata-rata bobot sekali petik. */
  averagePerSessionKg: number;
  /** Sama dengan actualPlantCount; nama lama, dipertahankan buat pemanggil. */
  plantCount: number;
};

export async function harvestSummary(
  seasonId: string
): Promise<HarvestSummary> {
  const [harvests, sales, season, losses, plantEvents] = await Promise.all([
    prisma.harvestLog.aggregate({
      where: { seasonId },
      _sum: { goodKg: true, rejectKg: true },
      _max: { harvestDate: true },
      _count: { _all: true },
    }),
    listSales(seasonId),
    prisma.season.findUnique({
      where: { id: seasonId },
      select: { plantCount: true },
    }),
    prisma.harvestLoss.groupBy({
      by: ["grade"],
      where: { seasonId },
      _sum: { weightKg: true },
    }),
    prisma.plantEvent.groupBy({
      by: ["type"],
      where: { seasonId },
      _sum: { count: true },
    }),
  ]);

  const harvested: GradeWeights = {
    GOOD: harvests._sum.goodKg ?? 0,
    REJECT: harvests._sum.rejectKg ?? 0,
  };

  const lost = emptyWeights();
  for (const row of losses) lost[row.grade] += row._sum.weightKg ?? 0;

  const sold = emptyWeights();
  let income = 0;
  let sellableIncome = 0;
  let rejectIncome = 0;
  let received = 0;
  let outstanding = 0;
  let outstandingCount = 0;

  for (const sale of sales) {
    for (const item of sale.items) {
      sold[item.grade] += item.weightKg;
      if (item.grade === "GOOD") sellableIncome += item.total;
      else rejectIncome += item.total;
    }

    income += sale.totalAmount;

    if (sale.isPaid) {
      received += sale.totalAmount;
    } else {
      outstanding += sale.totalAmount;
      outstandingCount += 1;
    }
  }

  const died =
    plantEvents.find((row) => row.type === "DIED")?._sum.count ?? 0;
  const replanted =
    plantEvents.find((row) => row.type === "REPLANTED")?._sum.count ?? 0;
  const planted = season?.plantCount ?? 0;
  const standing = actualPlantCount(planted, died, replanted);

  const totalSoldKg = totalOf(sold);
  const totalHarvestedKg = totalOf(harvested);
  const sessionCount = harvests._count._all;

  // Gone as well as sold: chillies that rotted are not sitting in a crate
  // waiting for a buyer.
  const unsold = {
    GOOD: unsoldBalance(harvested, sold).GOOD - lost.GOOD,
    REJECT: unsoldBalance(harvested, sold).REJECT - lost.REJECT,
  };

  return {
    sessionCount,
    averagePerSessionKg:
      sessionCount > 0 ? totalHarvestedKg / sessionCount : 0,
    plantedCount: planted,
    diedCount: died,
    replantedCount: replanted,
    actualPlantCount: standing,
    mortalityRate: mortalityRate(planted, standing),
    plantCount: standing,
    harvested,
    sold,
    lost,
    unsold,
    totalHarvestedKg,
    totalSoldKg,
    sellableHarvestedKg: harvested.GOOD,
    sellableSoldKg: sold.GOOD,
    sellableUnsoldKg: unsold.GOOD,
    gradeOutRate: gradeOutRate(harvested),
    income,
    sellableIncome,
    rejectIncome,
    received,
    outstanding,
    outstandingCount,
    // Bagus only: mixing in afkir would drag the figure down with a grade that
    // is a bonus, not a target.
    averagePricePerKg: averagePrice(sellableIncome, sold.GOOD),
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

export type HarvestPointRow = {
  hst: number;
  date: string;
  good: number;
  reject: number;
};

/**
 * Yield plotted against crop age rather than the calendar.
 *
 * HST is what lets one planting be laid over another: two seasons started
 * months apart still line up at "day 90". Pickings on the same day are added
 * together, since two trips to the same block are one day's yield.
 */
export async function harvestCurve(
  seasonId: string,
  startDate: Date
): Promise<HarvestPointRow[]> {
  const rows = await prisma.harvestLog.findMany({
    where: { seasonId },
    orderBy: { harvestDate: "asc" },
    select: { harvestDate: true, goodKg: true, rejectKg: true },
  });

  const byHst = new Map<number, HarvestPointRow>();

  for (const row of rows) {
    const hst = calculateHst(startDate, row.harvestDate);
    const existing = byHst.get(hst);

    if (existing) {
      existing.good += row.goodKg;
      existing.reject += row.rejectKg;
    } else {
      byHst.set(hst, {
        hst,
        date: formatDate(row.harvestDate),
        good: row.goodKg,
        reject: row.rejectKg,
      });
    }
  }

  return [...byHst.values()].sort((a, b) => a.hst - b.hst);
}

export type PlantEventRow = {
  id: string;
  eventDate: Date;
  type: "DIED" | "REPLANTED";
  count: number;
  cause: string | null;
  note: string | null;
  finding: { id: string; symptoms: string } | null;
  recordedBy: { id: string; name: string } | null;
};

export async function listPlantEvents(
  seasonId: string
): Promise<PlantEventRow[]> {
  return prisma.plantEvent.findMany({
    where: { seasonId },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      eventDate: true,
      type: true,
      count: true,
      cause: true,
      note: true,
      finding: { select: { id: true, symptoms: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });
}

export type HarvestLossRow = {
  id: string;
  lostAt: Date;
  grade: ChiliGradeValue;
  weightKg: number;
  reason: string | null;
  note: string | null;
  recordedBy: { id: string; name: string } | null;
};

export async function listHarvestLosses(
  seasonId: string
): Promise<HarvestLossRow[]> {
  return prisma.harvestLoss.findMany({
    where: { seasonId },
    orderBy: [{ lostAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      lostAt: true,
      grade: true,
      weightKg: true,
      reason: true,
      note: true,
      recordedBy: { select: { id: true, name: true } },
    },
  });
}
