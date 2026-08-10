import "server-only";

import { prisma } from "@/lib/prisma";
import { needsRestock } from "@/lib/stock";
import type {
  MaterialCategory,
  StockReason,
  ToolCondition,
} from "@/generated/prisma/client";

// Re-exported so components can name these without reaching into the generated
// client, which ESLint blocks outside src/server.
export type { MaterialCategory, StockReason, ToolCondition };

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
  notes: string | null;
  /** Which recipes call for it — what makes the shopping list actionable. */
  usedBy: { id: string; name: string; amountPerLiter: number }[];
  _count: { recipeItems: number };
};

export async function listStock(): Promise<StockRow[]> {
  const materials = await prisma.material.findMany({
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
      note: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  });
}

export type ToolRow = {
  id: string;
  name: string;
  quantity: number;
  condition: ToolCondition;
  lastServicedAt: Date | null;
  notes: string | null;
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
      notes: true,
    },
  });
}
