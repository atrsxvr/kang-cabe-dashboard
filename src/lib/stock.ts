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
 * What to buy so the material is off the list, said the way it is bought.
 *
 * "Off the list" means strictly above the threshold: stock that sits exactly
 * on it is still Menipis — reaching the line is the signal to buy, the way a
 * gardener reads "two doses left". So topping up only to the threshold, as
 * this once did, left the material Menipis straight after buying it.
 *
 * With a known pack the answer is a whole number of packs, enough to clear
 * the line; half a sack is not sold, and coming home short costs another
 * trip. Without one there is no sensible amount to name beyond "more than
 * the shortfall", so `amount` is null and nothing is pre-filled.
 */
export function restockSuggestion(
  stock: number,
  minStock: number,
  unit: string,
  packName: string | null,
  packSize: number | null
): { text: string; amount: number | null } {
  const shortfall = Math.max(0, minStock - stock);

  if (packName && packSize && packSize > 0) {
    const packs = Math.floor(shortfall / packSize) + 1;
    const amount = packs * packSize;
    return {
      text: `beli ${packs.toLocaleString("id-ID")} ${packName} (${formatStock(amount, unit)})`,
      amount,
    };
  }

  return {
    text:
      shortfall > 0
        ? // Scaled with the figures beside it: "sisa 0,01 kg (min 1 kg) ·
          // beli lebih dari 0,99 kg", not "… lebih dari 990 gram".
          `beli lebih dari ${formatStock(shortfall, unit, Math.max(stock, minStock))}`
        : "tepat di batas — beli sedikit saja sudah lewat",
    amount: null,
  };
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

/**
 * Whether a material can be deleted outright instead of archived.
 *
 * Only a registration that went nowhere — a typo, a duplicate. No recipe uses
 * it, no task has drawn on it, and the only movement on record is the opening
 * count typed when it was registered. That opening row is a CORRECTION, not a
 * purchase: it never touched cash and was never charged to a season, so
 * nothing anyone has reported on goes with it.
 *
 * Anything more and it has a history, and history is archived, never deleted.
 */
export function canDeleteMaterial(
  count: { recipeItems: number; movements: number; taskUsages: number },
  hasOpening: boolean
): boolean {
  return (
    count.recipeItems === 0 &&
    count.taskUsages === 0 &&
    count.movements <= (hasOpening ? 1 : 0)
  );
}

/**
 * The units a price can be quoted in, largest first.
 *
 * Grams are bought per kg at the shop, but a pesticide may be priced per ml
 * by its maker and per liter by the shop that sells it — so a scaled unit
 * offers both, and anything else is priced per itself (per pcs, per sak).
 * `per` is how many stock units one quoted unit holds.
 */
export function priceBases(unit: string): { label: string; per: number }[] {
  const scale = SCALES[unit];
  return scale
    ? [
        { label: scale.to, per: scale.per },
        { label: unit, per: 1 },
      ]
    : [{ label: unit, per: 1 }];
}

/**
 * "Rp 25.000 per kg, 200 gram of it" → Rp 5.000, in whole rupiah.
 *
 * The arithmetic people get wrong when asked for a total: typing the per-kg
 * price where the total belongs makes the material five times dearer than it
 * is, silently, and every season it is used in pays for it.
 */
export function totalFromUnitPrice(
  price: number,
  quantity: number,
  per: number
): number {
  return Math.round((price * quantity) / per);
}

/** The reverse, for showing a typed total back as a price per quoted unit. */
export function unitPriceFromTotal(
  total: number,
  quantity: number,
  per: number
): number | null {
  if (quantity <= 0) return null;
  return Math.round((total * per) / quantity);
}
