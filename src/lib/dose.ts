/**
 * Doses are stored per litre so any tank size stays correct without arithmetic
 * in the field. The reference garden mixes 45 L at a time, which is where the
 * default comes from — but a half tank or a borrowed 16 L sprayer must not
 * require recalculating by hand, which is exactly where a factor-of-ten
 * mistake burns a crop.
 */
export const DEFAULT_TANK_LITRES = 45;

export type DoseItem = {
  amountPerLiter: number;
  material: { name: string; unit: string };
};

/**
 * Rounds to a precision a person can actually measure. Scales are read to the
 * gram; showing 89.99999 g helps nobody, and dropping to whole numbers would
 * lose a 0.5 ml/L dose entirely.
 */
export function formatAmount(value: number): string {
  const rounded =
    value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;

  return rounded.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

export function amountForVolume(item: DoseItem, litres: number): number {
  return item.amountPerLiter * litres;
}

/** "2 g/L" — the concentration, shown alongside the batch figure. */
export function formatConcentration(item: DoseItem): string {
  return `${formatAmount(item.amountPerLiter)} ${item.material.unit}/L`;
}

/**
 * The date harvesting may resume after an application. Returns null when the
 * recipe carries no waiting period.
 */
export function safeHarvestDate(
  appliedAt: Date,
  preHarvestIntervalDays: number | null
): Date | null {
  if (!preHarvestIntervalDays) return null;

  const date = new Date(appliedAt);
  date.setDate(date.getDate() + preHarvestIntervalDays);
  return date;
}
