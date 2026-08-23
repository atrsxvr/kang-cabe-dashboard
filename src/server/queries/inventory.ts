import "server-only";

import { prisma } from "@/lib/prisma";
import { stockValue } from "@/lib/money";
import { expiryStatus, needsRestock } from "@/lib/stock";
import { serviceStatus } from "@/lib/tools";
import type {
  MaterialCategory,
  StockReason,
  ToolCondition,
  ToolEventType,
} from "@/generated/prisma/client";

// Re-exported so components can name these without reaching into the generated
// client, which ESLint blocks outside src/server.
export type { MaterialCategory, StockReason, ToolCondition, ToolEventType };

/**
 * Shed data is not season-scoped: a sack of fertiliser and a hoe outlive any
 * one planting. The same exception the recipe library already carries.
 */

export type StockRow = {
  id: string;
  name: string;
  unit: string;
  category: MaterialCategory;
  stock: number;
  minStock: number;
  /** Harga rata-rata per satuan. Nol berarti belum ada belanja berharga. */
  avgCost: number;
  purchaseUnit: string | null;
  purchaseSize: number | null;
  expiresAt: Date | null;
  archivedAt: Date | null;
  notes: string | null;
  /** Which recipes call for it — what makes the shopping list actionable. */
  usedBy: { id: string; name: string; amountPerLiter: number }[];
  _count: { recipeItems: number };
};

/**
 * The shed as it stands. Archived materials are left out — they are hidden
 * from every picker too, which is the point of archiving rather than deleting.
 */
export async function listStock(
  { includeArchived = false } = {}
): Promise<StockRow[]> {
  const materials = await prisma.material.findMany({
    where: includeArchived ? undefined : { archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { recipeItems: true } },
      recipeItems: {
        select: {
          amountPerLiter: true,
          recipe: { select: { id: true, name: true } },
        },
      },
    },
  });

  return materials.map(({ recipeItems, ...material }) => ({
    ...material,
    usedBy: recipeItems.map((item) => ({
      id: item.recipe.id,
      name: item.recipe.name,
      amountPerLiter: item.amountPerLiter,
    })),
  }));
}

/** Bahan yang sudah diarsipkan, untuk dihitung dan ditawarkan kembali. */
export async function listArchivedStock(): Promise<StockRow[]> {
  const rows = await listStock({ includeArchived: true });
  return rows.filter((row) => row.archivedAt !== null);
}

/** Kedaluwarsa yang sudah lewat atau tinggal sebentar lagi. */
export function selectExpiring(rows: StockRow[]): StockRow[] {
  return rows
    .filter((row) => {
      const status = expiryStatus(row.expiresAt);
      return status === "EXPIRED" || status === "SOON";
    })
    .sort(
      (a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0)
    );
}

/** Kapan terakhir gudang dihitung fisik. */
export async function lastOpname() {
  return prisma.stockOpname.findFirst({
    orderBy: { countedAt: "desc" },
    select: {
      countedAt: true,
      checked: true,
      corrected: true,
      actor: { select: { name: true } },
    },
  });
}

/** Everything at or below its threshold — the shopping list. */
export function selectRestock(rows: StockRow[]): StockRow[] {
  return rows
    .filter((row) => needsRestock(row.stock, row.minStock))
    // Out of stock first: those block work today.
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
}

export type MovementRow = {
  id: string;
  delta: number;
  reason: StockReason;
  totalCost: number | null;
  note: string | null;
  createdAt: Date;
  actor: { id: string; name: string } | null;
};

export async function listMovements(
  materialId: string,
  take = 20
): Promise<MovementRow[]> {
  return prisma.stockMovement.findMany({
    where: { materialId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      delta: true,
      reason: true,
      totalCost: true,
      note: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  });
}

/** Nilai seluruh isi gudang pada harga rata-rata yang dibayar. */
export function totalStockValue(rows: StockRow[]): number {
  return rows.reduce((sum, row) => sum + stockValue(row.stock, row.avgCost), 0);
}

/** Belanja yang tercatat tanpa harga — masih bisa dilengkapi. */
export async function countUnpricedPurchases(): Promise<number> {
  return prisma.stockMovement.count({
    where: { reason: "PURCHASE", totalCost: null },
  });
}

export type ToolRow = {
  id: string;
  name: string;
  quantity: number;
  condition: ToolCondition;
  lastServicedAt: Date | null;
  serviceIntervalDays: number | null;
  heldBy: { id: string; name: string } | null;
  notes: string | null;
  events: {
    id: string;
    type: ToolEventType;
    quantity: number;
    totalCost: number | null;
    note: string | null;
    createdAt: Date;
    actor: { name: string } | null;
  }[];
};

export async function listTools(): Promise<ToolRow[]> {
  return prisma.tool.findMany({
    // Broken and due-for-service first: the list exists to surface those.
    orderBy: [{ condition: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      quantity: true,
      condition: true,
      lastServicedAt: true,
      serviceIntervalDays: true,
      heldBy: { select: { id: true, name: true } },
      notes: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          type: true,
          quantity: true,
          totalCost: true,
          note: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
    },
  });
}

/**
 * Tools that belong on the trip to town, split by what is actually needed
 * there. A tool needing service is an errand, not a purchase — putting both
 * under one heading would fill the shopping list with things nobody is buying.
 */
export function selectToolNeeds(tools: ToolRow[]) {
  return {
    replace: tools.filter(
      (tool) => tool.quantity === 0 || tool.condition === "BROKEN"
    ),
    service: tools.filter(
      (tool) =>
        tool.quantity > 0 &&
        // Either someone reported it broken, or its own schedule says it is
        // time — a tank nobody has complained about is still due at 90 days.
        (tool.condition === "NEEDS_SERVICE" ||
          serviceStatus(tool.lastServicedAt, tool.serviceIntervalDays) ===
            "OVERDUE")
    ),
  };
}

export type ShoppingNoteRow = {
  id: string;
  text: string;
  done: boolean;
  createdAt: Date;
  actor: { name: string } | null;
};

export async function listShoppingNotes(): Promise<ShoppingNoteRow[]> {
  return prisma.shoppingNote.findMany({
    // Outstanding first, then oldest — the order you would read a list in.
    orderBy: [{ done: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      text: true,
      done: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });
}
