import "server-only";

import { prisma } from "@/lib/prisma";
import { harvestSummary } from "@/server/queries/harvest";
import type { MaterialCategory } from "@/generated/prisma/client";

/**
 * What a season actually spent on materials.
 *
 * Taken from recorded usage, not from purchases. A sack bought today may be
 * half gone by the next planting, so charging the whole thing to whichever
 * season happened to be running when the money left would make both seasons'
 * numbers wrong. The figures here are the ones frozen onto `TaskMaterial` the
 * moment the shed actually gave something up.
 *
 * Season-scoped by rule: an unscoped total would fold one planting's spending
 * into another's report.
 */

export type CostLine = {
  key: string;
  label: string;
  amount: number;
  /** Rows behind the figure, so a total nobody expected can be opened up. */
  detail: string;
};

export type SeasonMaterialCost = {
  total: number;
  byCategory: CostLine[];
  byMaterial: CostLine[];
  /** Pemakaian tercatat yang bahannya belum punya harga sama sekali. */
  unpricedUsages: number;
};

export async function seasonMaterialCost(
  seasonId: string
): Promise<SeasonMaterialCost> {
  // Two ways stock is charged to a season, and no overlap between them:
  // materials frozen onto a task, and stock taken straight off the shelf with
  // a season named. recordTaskUsage deliberately leaves StockMovement.seasonId
  // empty so a task's usage cannot be counted from both sides.
  const [fromTasks, fromShelf] = await Promise.all([
    prisma.taskMaterial.findMany({
      where: { task: { seasonId }, totalCost: { not: null } },
      select: {
        amount: true,
        totalCost: true,
        material: {
          select: { id: true, name: true, unit: true, category: true },
        },
      },
    }),
    prisma.stockMovement.findMany({
      where: { seasonId, reason: { in: ["USAGE", "LOSS"] } },
      select: {
        delta: true,
        totalCost: true,
        material: {
          select: { id: true, name: true, unit: true, category: true },
        },
      },
    }),
  ]);

  const rows = [
    ...fromTasks,
    ...fromShelf.map((row) => ({
      amount: Math.abs(row.delta),
      totalCost: row.totalCost,
      material: row.material,
    })),
  ];

  const byMaterial = new Map<
    string,
    { name: string; unit: string; category: MaterialCategory; amount: number; qty: number }
  >();

  let total = 0;
  let unpricedUsages = 0;

  for (const row of rows) {
    const cost = row.totalCost ?? 0;
    // Recorded, but the material had no price at the time. Counting it as
    // Rp 0 would understate the season without saying so — it is reported
    // separately instead.
    if (cost === 0) unpricedUsages += 1;

    total += cost;

    const existing = byMaterial.get(row.material.id);
    if (existing) {
      existing.amount += cost;
      existing.qty += row.amount;
    } else {
      byMaterial.set(row.material.id, {
        name: row.material.name,
        unit: row.material.unit,
        category: row.material.category,
        amount: cost,
        qty: row.amount,
      });
    }
  }

  const materials = [...byMaterial.entries()]
    .map(([id, row]) => ({
      key: id,
      label: row.name,
      amount: row.amount,
      detail: `${formatQty(row.qty)} ${row.unit}`,
      category: row.category,
    }))
    .sort((a, b) => b.amount - a.amount);

  const categories = new Map<MaterialCategory, { amount: number; count: number }>();
  for (const row of materials) {
    const existing = categories.get(row.category);
    if (existing) {
      existing.amount += row.amount;
      existing.count += 1;
    } else {
      categories.set(row.category, { amount: row.amount, count: 1 });
    }
  }

  return {
    total,
    byCategory: [...categories.entries()]
      .map(([category, row]) => ({
        key: category,
        label: category,
        amount: row.amount,
        detail: `${row.count} bahan`,
      }))
      .sort((a, b) => b.amount - a.amount),
    byMaterial: materials.map((row) => ({
      key: row.key,
      label: row.label,
      amount: row.amount,
      detail: row.detail,
    })),
    unpricedUsages,
  };
}

function formatQty(value: number): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export type ToolSpend = {
  total: number;
  bought: number;
  serviced: number;
};

/**
 * Money that went out on tools. Not season-scoped — a hoe outlives a planting,
 * the same exception the shed already carries — and deliberately not
 * depreciated: a cangkul is not used up by the gram, and spreading its cost
 * over time would produce a figure nobody in this team would recognise.
 */
export async function toolSpend(): Promise<ToolSpend> {
  const rows = await prisma.toolEvent.groupBy({
    by: ["type"],
    where: { totalCost: { not: null } },
    _sum: { totalCost: true },
  });

  const of = (type: string) =>
    rows.find((row) => row.type === type)?._sum.totalCost ?? 0;

  const bought = of("ACQUIRED");
  const serviced = of("SERVICED");

  return { total: bought + serviced, bought, serviced };
}

export type FinanceEntryRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  description: string;
  date: Date;
  proofUrl: string | null;
};

export async function listFinanceEntries(
  seasonId: string
): Promise<FinanceEntryRow[]> {
  const rows = await prisma.financeTransaction.findMany({
    where: { seasonId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      category: true,
      amount: true,
      description: true,
      date: true,
      proofUrl: true,
    },
  });

  return rows;
}

export type SeasonResult = {
  /** Penjualan panen ditambah pemasukan lain yang dicatat manual. */
  income: number;
  salesIncome: number;
  otherIncome: number;
  received: number;
  outstanding: number;
  materialCost: number;
  /** Upah, sewa, transport — yang tidak lewat gudang maupun timbangan. */
  otherCost: number;
  totalCost: number;
  /** Pemasukan dikurangi seluruh biaya yang tercatat. */
  margin: number;
  costByCategory: CostLine[];
};

/**
 * The two sides, side by side at last.
 *
 * Deliberately called a margin and not a profit: it is income less the cost of
 * materials consumed, and nothing else. Labour, rent and transport are not
 * recorded anywhere yet, so calling this profit would overstate it by whatever
 * those come to — and four people splitting a number that flatters them is
 * exactly the failure worth avoiding.
 *
 * Tool spending is left out for the same reason it is not depreciated: a
 * cangkul serves several plantings, and charging it to whichever one happened
 * to buy it would misreport them all.
 */
export async function seasonResult(seasonId: string): Promise<SeasonResult> {
  const [cost, summary, entries] = await Promise.all([
    seasonMaterialCost(seasonId),
    harvestSummary(seasonId),
    listFinanceEntries(seasonId),
  ]);

  const byCategory = new Map<string, number>();
  let otherCost = 0;
  let otherIncome = 0;

  for (const entry of entries) {
    if (entry.type === "EXPENSE") {
      otherCost += entry.amount;
      byCategory.set(
        entry.category,
        (byCategory.get(entry.category) ?? 0) + entry.amount
      );
    } else {
      otherIncome += entry.amount;
    }
  }

  const income = summary.income + otherIncome;
  const totalCost = cost.total + otherCost;

  return {
    income,
    salesIncome: summary.income,
    otherIncome,
    received: summary.received,
    outstanding: summary.outstanding,
    materialCost: cost.total,
    otherCost,
    totalCost,
    margin: income - totalCost,
    costByCategory: [
      ...(cost.total > 0
        ? [
            {
              key: "__material",
              label: "Bahan",
              amount: cost.total,
              detail: "dari pemakaian tercatat",
            },
          ]
        : []),
      ...[...byCategory.entries()]
        .map(([category, amount]) => ({
          key: category,
          label: category,
          amount,
          detail: "dicatat manual",
        }))
        .sort((a, b) => b.amount - a.amount),
    ],
  };
}

export type ProfitShareRow = {
  id: string;
  name: string;
  share: number;
  amount: number;
};

export type ProfitSharing = {
  margin: number;
  totalShare: number;
  rows: ProfitShareRow[];
  /** Yang belum teralokasi karena porsinya belum genap 100%. */
  unallocated: number;
};

/**
 * Splits the margin by each member's agreed percentage.
 *
 * The percentages are not normalised to add up to 100. If four people have
 * agreed on shares that leave a gap, that gap is a conversation they need to
 * have — quietly inflating everyone's slice to hide it would settle it on
 * their behalf, and wrongly.
 */
export async function profitSharing(
  seasonId: string
): Promise<ProfitSharing> {
  const [result, members] = await Promise.all([
    seasonResult(seasonId),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, profitShare: true },
    }),
  ]);

  const totalShare = members.reduce((sum, m) => sum + m.profitShare, 0);
  const base = Math.max(0, result.margin);

  const rows = members.map((member) => ({
    id: member.id,
    name: member.name,
    share: member.profitShare,
    amount: Math.round((base * member.profitShare) / 100),
  }));

  return {
    margin: result.margin,
    totalShare,
    rows,
    unallocated: base - rows.reduce((sum, row) => sum + row.amount, 0),
  };
}

export type SeasonComparison = {
  id: string;
  name: string;
  status: string;
  income: number;
  cost: number;
  margin: number;
  harvestedKg: number;
  /** Rupiah per kilo panen — satu-satunya angka yang adil membandingkan musim. */
  perKg: number;
};

/**
 * Every season side by side.
 *
 * The headline figures do not compare well on their own: a season that ran
 * twice as long will show twice the income without being twice as good. The
 * margin per kilo harvested is the one number that survives the difference.
 */
export async function seasonComparison(): Promise<SeasonComparison[]> {
  const seasons = await prisma.season.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, status: true },
  });

  return Promise.all(
    seasons.map(async (season) => {
      const [result, summary] = await Promise.all([
        seasonResult(season.id),
        harvestSummary(season.id),
      ]);

      return {
        id: season.id,
        name: season.name,
        status: season.status,
        income: result.income,
        cost: result.totalCost,
        margin: result.margin,
        harvestedKg: summary.totalHarvestedKg,
        perKg:
          summary.totalHarvestedKg > 0
            ? Math.round(result.margin / summary.totalHarvestedKg)
            : 0,
      };
    })
  );
}
