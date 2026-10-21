import { lineTotal } from "@/lib/harvest";
import { roundUpToCash } from "@/lib/money";

/**
 * Buyers: who they are, and what they have paid.
 *
 * Pure, so the arithmetic behind a buyer's page can be tested without a
 * database — and so the page and the export can never compute it twice.
 */

export const BUYER_KINDS = ["PENGEPUL", "PASAR", "KONSUMEN"] as const;
export type BuyerKindValue = (typeof BUYER_KINDS)[number];

export const buyerKindLabels: Record<BuyerKindValue, string> = {
  PENGEPUL: "Pengepul",
  PASAR: "Pasar",
  KONSUMEN: "Konsumen langsung",
};

/**
 * A WhatsApp number as wa.me wants it: digits only, country code first.
 *
 * Typed the way people write them here — "0812-3456-7890", "+62 812…",
 * "62812…" — so a leading 0 is the Indonesian trunk prefix and becomes 62.
 * Anything too short to be a phone number is not one.
 */
export function waNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/**
 * Brought over from a free-typed name, and so missing what every buyer now
 * has to have. Shown as "lengkapi data" until someone fills it in.
 */
export function buyerIncomplete(buyer: {
  location: string | null;
  kind: string | null;
}): boolean {
  return !buyer.location?.trim() || !buyer.kind;
}

export type BuyerSaleInput = {
  soldAt: Date;
  items: { grade: "GOOD" | "REJECT"; weightKg: number; pricePerKg: number }[];
};

export type BuyerTotals = {
  saleCount: number;
  totalKg: number;
  goodKg: number;
  /** What changed hands, each sale rounded up to Rp 500 as it was paid. */
  totalAmount: number;
  /** Rupiah per kilo of Bagus — the price worth comparing across buyers. */
  averageGoodPrice: number | null;
  lastSoldAt: Date | null;
};

/**
 * What one buyer has bought, across every season.
 *
 * The average is over Bagus only and weighted by kilos — the same footing as
 * the harvest page's average price — so a buyer who takes afkir cheaply is not
 * mistaken for one who pays badly for the good crop.
 */
export function buyerTotals(sales: BuyerSaleInput[]): BuyerTotals {
  let totalKg = 0;
  let goodKg = 0;
  let goodIncome = 0;
  let totalAmount = 0;
  let lastSoldAt: Date | null = null;

  for (const sale of sales) {
    let subtotal = 0;
    for (const item of sale.items) {
      const line = lineTotal(item.weightKg, item.pricePerKg);
      subtotal += line;
      totalKg += item.weightKg;
      if (item.grade === "GOOD") {
        goodKg += item.weightKg;
        goodIncome += line;
      }
    }
    totalAmount += roundUpToCash(subtotal);
    if (!lastSoldAt || sale.soldAt > lastSoldAt) lastSoldAt = sale.soldAt;
  }

  return {
    saleCount: sales.length,
    totalKg,
    goodKg,
    totalAmount,
    averageGoodPrice: goodKg > 0 ? Math.round(goodIncome / goodKg) : null,
    lastSoldAt,
  };
}

/** Case and spacing do not make a different person: "pak  Ujang" = "Pak Ujang". */
export function sameBuyerName(a: string, b: string): boolean {
  const norm = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return norm(a) === norm(b);
}
