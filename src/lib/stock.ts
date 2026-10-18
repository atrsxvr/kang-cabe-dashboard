import { daysUntil } from "@/lib/hst";

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

export function formatStock(
  value: number,
  unit: string,
  /**
   * Picks the scale instead of `value`. Pass the larger of two figures shown
   * side by side, so "1 kg / min 100 gram" reads "1 kg / min 0,1 kg".
   */
  scaleFrom: number = value
): string {
  const scale = SCALES[unit];
  const useScale = scale && Math.abs(scaleFrom) >= scale.per;

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
  const larger = Math.max(stock, minStock);
  return `sisa ${formatStock(stock, unit, larger)} (min ${formatStock(minStock, unit, larger)})`;
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
 * Amelioran is left out with them: dolomite and lime are spread on the soil
 * by the sack, not mixed into a tank. A sticker (perekat) and biological
 * agents are in — both go into the sprayer by the millilitre.
 *
 * OTHER stays in: it is the escape hatch for something real that has no
 * category yet, and closing it would be worse than the odd wrong pick.
 */
const DOSABLE = new Set([
  "FERTILIZER",
  "BOOSTER",
  "BIOLOGICAL",
  "PESTICIDE",
  "INSECTICIDE",
  "ACARICIDE",
  "FUNGICIDE",
  "GROWTH_REGULATOR",
  "ADHESIVE",
  "OTHER",
]);

export function isDosable(category: string): boolean {
  return DOSABLE.has(category);
}

/**
 * How much to buy, said the way it is bought.
 *
 * Stock is kept in the unit a recipe doses in, which is right for the shed and
 * wrong at the counter: "beli min. 5.000 gram" is not a thing anyone asks for.
 * When a material knows its purchase unit, the shopping list leads with that
 * and keeps the exact figure in brackets behind it.
 */
export function describePurchase(
  needed: number,
  unit: string,
  purchaseUnit: string | null,
  purchaseSize: number | null
): string {
  const exact = formatStock(needed, unit);

  if (!purchaseUnit || !purchaseSize || purchaseSize <= 0) return exact;

  // Rounded up: half a sack is not sold, and coming home short means the job
  // waits for another trip to town.
  const packs = Math.ceil(needed / purchaseSize);

  return `${packs.toLocaleString("id-ID")} ${purchaseUnit} (${exact})`;
}

export type ExpiryStatus = "NONE" | "OK" | "SOON" | "EXPIRED";

/** A month's warning: enough to use it up or plan around it, not so early it becomes noise. */
export const EXPIRY_SOON_DAYS = 30;

export function expiryStatus(
  expiresAt: Date | null,
  now: Date = new Date()
): ExpiryStatus {
  if (!expiresAt) return "NONE";

  const days = daysUntil(expiresAt, now);
  if (days < 0) return "EXPIRED";
  return days <= EXPIRY_SOON_DAYS ? "SOON" : "OK";
}

/**
 * Note on the movement written when a material is registered with stock.
 * It is how that one row is found again when its value is corrected from the
 * edit dialog — the reason alone is shared with every opname correction.
 */
export const OPENING_NOTE = "Saldo awal saat bahan didaftarkan";

/**
 * Whether a material's unit can still change. Once any quantity has been
 * written against it — stock moved, a recipe dose, a task's copied amount —
 * every one of those numbers means the old unit, and a new one would silently
 * reinterpret them all.
 */
export function unitLocked(count: {
  recipeItems: number;
  movements: number;
  taskUsages: number;
}): boolean {
  return count.recipeItems + count.movements + count.taskUsages > 0;
}
