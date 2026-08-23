/**
 * Whether the season comparison has anything to compare.
 *
 * The per-kilo figure exists for exactly one job: putting two seasons of
 * different sizes on the same footing. With one season it is a true statement
 * about that season and a useless one for the purpose it is printed under —
 * which reads, fairly, as a number nobody can explain. Counting how many
 * seasons can actually take part is what lets the card say so out loud instead
 * of showing a lone row under a heading that promises a comparison.
 */

export type ComparableSeason = { harvestedKg: number };

/**
 * Seasons that can take part in a per-kilo comparison.
 *
 * Kilos picked is the denominator, so a season without a harvest cannot
 * produce the figure at all — a planting still being prepared is not a weak
 * season, it is one that has not started answering the question yet.
 */
export function comparableSeasons(rows: ComparableSeason[]): number {
  return rows.filter((row) => row.harvestedKg > 0).length;
}

/** Butuh minimal dua musim berpanen sebelum angka per kilo ada lawannya. */
export function canCompareSeasons(rows: ComparableSeason[]): boolean {
  return comparableSeasons(rows) >= 2;
}
