/**
 * Splitting a season's margin by the capital each member put in.
 *
 * The owners' rule: a member's cut is their net capital — paid in, less taken
 * back — as a share of everyone's. Nobody types a percentage, so there is no
 * agreed figure to drift out of step with the money actually in the pot, and
 * no gap of "belum ada pemiliknya" to explain.
 */

export type CapitalHolder = {
  id: string;
  name: string;
  /** Net capital in rupiah at the cut-off date. */
  net: number;
};

export type ShareRow = {
  id: string;
  name: string;
  net: number;
  /** Percent of the capital, to one decimal — for reading, not for sums. */
  share: number;
  /** Whole rupiah. The rows always add up to exactly the amount split. */
  amount: number;
};

/**
 * Divides `amount` in proportion to each holder's net capital.
 *
 * Whole rupiah by largest remainder: everyone gets the floor of their exact
 * slice, then the leftover rupiah go one each to the largest fractions. The
 * total therefore always equals `amount` — a split that loses or invents a
 * rupiah cannot be explained to four people comparing transfers.
 *
 * Holders with no capital, or capital already taken back in full, get nothing
 * and are left out.
 */
export function splitByCapital(
  amount: number,
  holders: CapitalHolder[]
): { rows: ShareRow[]; capitalTotal: number } {
  const owners = holders.filter((holder) => holder.net > 0);
  const capitalTotal = owners.reduce((sum, holder) => sum + holder.net, 0);

  if (capitalTotal <= 0) return { rows: [], capitalTotal: 0 };

  const base = Math.max(0, Math.round(amount));
  const exact = owners.map((holder) => (base * holder.net) / capitalTotal);
  const floors = exact.map(Math.floor);
  let leftover = base - floors.reduce((sum, value) => sum + value, 0);

  // Largest fraction first; ties go to the larger capital, then by name, so
  // the same inputs always give the same rupiah to the same person.
  const order = owners
    .map((holder, index) => ({ index, fraction: exact[index] - floors[index] }))
    .sort(
      (a, b) =>
        b.fraction - a.fraction ||
        owners[b.index].net - owners[a.index].net ||
        owners[a.index].name.localeCompare(owners[b.index].name)
    );

  const amounts = [...floors];
  for (const { index } of order) {
    if (leftover <= 0) break;
    amounts[index] += 1;
    leftover -= 1;
  }

  const rows = owners
    .map((holder, index) => ({
      id: holder.id,
      name: holder.name,
      net: holder.net,
      share: Math.round((holder.net / capitalTotal) * 1000) / 10,
      amount: amounts[index],
    }))
    .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));

  return { rows, capitalTotal };
}
