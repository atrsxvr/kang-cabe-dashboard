import "server-only";

import {
  buyerIncomplete,
  buyerTotals,
  type BuyerKindValue,
  type BuyerTotals,
} from "@/lib/buyers";
import { lineTotal } from "@/lib/harvest";
import { roundUpToCash } from "@/lib/money";
import { prisma } from "@/lib/prisma";

/**
 * Buyers are not season-scoped, the same exception the shed and the recipe
 * library carry: a regular pengepul outlives any one planting, and their
 * price history across plantings is the reason to keep them. What happens in
 * a season — each sale — still belongs to that season.
 */

export type BuyerOption = {
  id: string;
  name: string;
  kind: BuyerKindValue | null;
  location: string | null;
};

/**
 * For the sale form's picker: whoever bought most recently first, since the
 * same few come back; buyers who have not bought yet follow, by name.
 */
export async function buyerOptions(): Promise<BuyerOption[]> {
  const buyers = await prisma.buyer.findMany({
    select: {
      id: true,
      name: true,
      kind: true,
      location: true,
      sales: { select: { soldAt: true }, orderBy: { soldAt: "desc" }, take: 1 },
    },
  });

  const lastSale = (buyer: (typeof buyers)[number]) =>
    buyer.sales[0]?.soldAt.getTime() ?? 0;

  return buyers
    .sort((a, b) => lastSale(b) - lastSale(a) || a.name.localeCompare(b.name, "id"))
    .map(({ id, name, kind, location }) => ({ id, name, kind, location }));
}

export type BuyerRow = BuyerOption & {
  whatsapp: string | null;
  incomplete: boolean;
} & BuyerTotals;

const saleSelect = {
  soldAt: true,
  items: { select: { grade: true, weightKg: true, pricePerKg: true } },
} as const;

/** Every buyer with what they have bought, for the Pembeli tab. */
export async function listBuyers(): Promise<BuyerRow[]> {
  const buyers = await prisma.buyer.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      kind: true,
      location: true,
      whatsapp: true,
      sales: { select: saleSelect },
    },
  });

  return buyers
    .map(({ sales, ...buyer }) => ({
      ...buyer,
      incomplete: buyerIncomplete(buyer),
      ...buyerTotals(sales),
    }))
    // Incomplete first — they are the ones needing someone's attention —
    // then whoever bought most recently.
    .sort(
      (a, b) =>
        Number(b.incomplete) - Number(a.incomplete) ||
        (b.lastSoldAt?.getTime() ?? 0) - (a.lastSoldAt?.getTime() ?? 0) ||
        a.name.localeCompare(b.name, "id")
    );
}

export type BuyerSaleRow = {
  id: string;
  soldAt: Date;
  season: { id: string; name: string };
  isPaid: boolean;
  items: { grade: "GOOD" | "REJECT"; weightKg: number; pricePerKg: number }[];
  totalAmount: number;
};

export type BuyerDetail = BuyerRow & {
  sales: BuyerSaleRow[];
};

/** One buyer and every sale to them, newest first, across all seasons. */
export async function getBuyer(buyerId: string): Promise<BuyerDetail | null> {
  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
    select: {
      id: true,
      name: true,
      kind: true,
      location: true,
      whatsapp: true,
      sales: {
        orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          soldAt: true,
          isPaid: true,
          season: { select: { id: true, name: true } },
          items: {
            orderBy: { grade: "asc" },
            select: { grade: true, weightKg: true, pricePerKg: true },
          },
        },
      },
    },
  });

  if (!buyer) return null;

  return {
    id: buyer.id,
    name: buyer.name,
    kind: buyer.kind,
    location: buyer.location,
    whatsapp: buyer.whatsapp,
    incomplete: buyerIncomplete(buyer),
    ...buyerTotals(buyer.sales),
    sales: buyer.sales.map((sale) => ({
      ...sale,
      totalAmount: roundUpToCash(
        sale.items.reduce(
          (sum, item) => sum + lineTotal(item.weightKg, item.pricePerKg),
          0
        )
      ),
    })),
  };
}
