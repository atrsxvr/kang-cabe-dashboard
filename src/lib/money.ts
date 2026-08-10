/**
 * Rupiah, and the moving average behind "nilai barang di gudang".
 *
 * Money is kept as whole rupiah in `number`, never as a fraction. Cents do not
 * exist here, and a float that drifts by 0,0000001 produces a total nobody can
 * explain to three other people. The one exception is `avgCost`, which is a
 * rate per unit rather than an amount of money — Rp 32,5 per gram is a real
 * thing to say.
 */

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** "Rp 32/gram" — the unit price behind a purchase, shown back as a check. */
export function formatUnitPrice(value: number, unit: string): string {
  const rounded =
    value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;

  return `${new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(rounded)}/${unit}`;
}

/** What the shed is worth at the average price paid for what is in it. */
export function stockValue(stock: number, avgCost: number): number {
  return Math.round(stock * avgCost);
}

/**
 * Weighted average after more of something comes in.
 *
 * Any arrival carrying a price counts, not only a purchase — the quantity
 * typed when a material is first registered is stock the farm already owns,
 * and leaving it out would average that opening pile in at zero and drag the
 * price down the moment the first sack is bought.
 *
 * An arrival with no price leaves the average alone: it is treated as having
 * come in at the price already being paid. That is the least wrong guess, and
 * it keeps the number stable until the receipt turns up — at which point
 * `rebuildAvgCost` recomputes it from the whole history.
 */
export function nextAvgCost({
  stock,
  avgCost,
  addedQty,
  addedCost,
}: {
  stock: number;
  avgCost: number;
  addedQty: number;
  addedCost: number | null;
}): number {
  if (addedCost === null || addedQty <= 0) return avgCost;

  const total = stock + addedQty;
  if (total <= 0) return avgCost;

  // Stock can be zero here — the first purchase of a material simply sets the
  // price, because there is nothing to average against.
  return (Math.max(stock, 0) * avgCost + addedCost) / total;
}

export type CostMovement = {
  delta: number;
  reason: "PURCHASE" | "USAGE" | "CORRECTION" | "LOSS";
  totalCost: number | null;
};

/**
 * Replays a material's whole movement history to get its average price.
 *
 * `Material.avgCost` is stored, which brushes against the rule that derived
 * numbers are never kept. It earns the exception by being rebuildable: the
 * stored value is a cache of exactly this function, and a price filled in
 * weeks after the fact has to be able to correct an average that was already
 * written. Nothing may set `avgCost` in a way this cannot reproduce.
 *
 * `movements` must be oldest first.
 */
export function rebuildAvgCost(movements: CostMovement[]): number {
  let stock = 0;
  let avgCost = 0;

  for (const movement of movements) {
    if (movement.delta > 0) {
      avgCost = nextAvgCost({
        stock,
        avgCost,
        addedQty: movement.delta,
        addedCost: movement.totalCost,
      });
    }

    // Taking stock out never changes the average — that is the whole point of
    // an average. It only changes what the remaining stock is worth.
    stock = Math.max(0, stock + movement.delta);
  }

  return avgCost;
}
