export const STOCK_STATUSES = ["OUT_OF_STOCK", "LOW", "SAFE"] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];

/**
 * Derived, never stored. A status column and the numbers it describes are two
 * sources for one fact, and the moment a quick +/- forgets to recompute it the
 * badge starts lying about the shed.
 */
export function stockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= minStock) return "LOW";
  return "SAFE";
}

export function needsRestock(stock: number, minStock: number): boolean {
  return stockStatus(stock, minStock) !== "SAFE";
}

/**
 * Recipes and stock share one unit per material so the two can be compared
 * without conversion, which means grams stay grams — 5 kg of NPK is stored as
 * 5000. Displaying that raw is unreadable, so scale it back up for reading
 * only.
 */
const SCALES: Record<string, { to: string; per: number }> = {
  gram: { to: "kg", per: 1000 },
  ml: { to: "liter", per: 1000 },
};

export function formatStock(value: number, unit: string): string {
  const scale = SCALES[unit];
  const useScale = scale && Math.abs(value) >= scale.per;

  const amount = useScale ? value / scale.per : value;
  const shown = useScale ? scale.to : unit;

  return `${amount.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${shown}`;
}

/** "sisa 0,5 kg (min 1 kg)" — one line for the shopping list. */
export function describeShortfall(
  stock: number,
  minStock: number,
  unit: string
): string {
  if (stock <= 0) return "HABIS";
  return `sisa ${formatStock(stock, unit)} (min ${formatStock(minStock, unit)})`;
}

/** Field-name prefix for one material's counted amount in an opname form. */
export const OPNAME_PREFIX = "count:";

/**
 * Categories a recipe can actually dose.
 *
 * A recipe item is an amount per litre of water. Bamboo stakes, mulch film and
 * seed are all real stock, bought and used up, but none of them dissolves in a
 * tank — offering them where a dose is expected invites a number that means
 * nothing and cannot be caught later.
 *
 * OTHER stays in: it is the escape hatch for something real that has no
 * category yet, and closing it would be worse than the odd wrong pick.
 */
const DOSABLE = new Set([
  "FERTILIZER",
  "PESTICIDE",
  "FUNGICIDE",
  "GROWTH_REGULATOR",
  "OTHER",
]);

export function isDosable(category: string): boolean {
  return DOSABLE.has(category);
}
