import "server-only";

import { prisma } from "@/lib/prisma";
import { needsRestock } from "@/lib/stock";
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
  events: {
    id: string;
    type: ToolEventType;
    quantity: number;
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
      notes: true,
      events: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          type: true,
          quantity: true,
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
      (tool) => tool.quantity > 0 && tool.condition === "NEEDS_SERVICE"
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
