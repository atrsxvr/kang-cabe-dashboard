/**
 * Two grades, because two is what actually happens at the sorting table: what
 * is fit to sell whole, and what is not.
 *
 * Afkir still sells, only cheaper — it is a grade, not a loss, and treating it
 * as waste would misstate both the harvest and the income.
 */
export const CHILI_GRADES = ["GOOD", "REJECT"] as const;

export type ChiliGradeValue = (typeof CHILI_GRADES)[number];

export const gradeLabels: Record<ChiliGradeValue, string> = {
  GOOD: "Bagus",
  REJECT: "Afkir",
};

export const gradeTones: Record<ChiliGradeValue, string> = {
  GOOD: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  REJECT: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

/**
 * "12,5 kg", "0,25 kg" — up to two decimals, trailing zeros dropped.
 *
 * Two, not one: a quarter kilo is a real sale, and rounding 0,25 to 0,3 both
 * overstates what left and quietly disagrees with the money the buyer handed
 * over.
 */
export function formatKg(value: number): string {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`;
}

/**
 * The same, but always showing both decimals: "25,50 kg".
 *
 * For the running totals, where a column of figures is easier to compare when
 * the decimal point sits in the same place on every line — and where a
 * disappearing "0" would look like the quarter kilos had been dropped.
 */
export function formatKgPrecise(value: number): string {
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

export type GradeWeights = Record<ChiliGradeValue, number>;

export const emptyWeights = (): GradeWeights => ({ GOOD: 0, REJECT: 0 });

export function totalOf(weights: GradeWeights): number {
  return weights.GOOD + weights.REJECT;
}

/**
 * What is picked but not yet sold, per grade.
 *
 * Allowed to go negative, and shown when it does. Chillies pile up waiting for
 * a buyer, so the two sides are recorded days apart and in either order — a
 * sale entered before its harvest is a reminder that a picking has not been
 * written down, not corruption to be refused. The shed refuses a negative
 * because stock is the thing being protected; here the balance is derived, and
 * its sign is the message.
 */
export function unsoldBalance(
  harvested: GradeWeights,
  sold: GradeWeights
): GradeWeights {
  return {
    GOOD: harvested.GOOD - sold.GOOD,
    REJECT: harvested.REJECT - sold.REJECT,
  };
}

/** Nilai sebuah baris penjualan: bobot dikali harga, dibulatkan ke rupiah. */
export function lineTotal(weightKg: number, pricePerKg: number): number {
  return Math.round(weightKg * pricePerKg);
}

/** Harga rata-rata yang benar-benar didapat per kg, lintas mutu. */
export function averagePrice(totalAmount: number, totalKg: number): number {
  return totalKg > 0 ? Math.round(totalAmount / totalKg) : 0;
}
