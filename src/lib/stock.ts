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
