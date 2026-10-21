import { describe, expect, it } from "vitest";

import { splitByCapital } from "@/lib/profit-share";

const holder = (id: string, net: number) => ({ id, name: id.toUpperCase(), net });

describe("splitByCapital", () => {
  it("divides in proportion to net capital", () => {
    const { rows, capitalTotal } = splitByCapital(1_000_000, [
      holder("a", 6_000_000),
      holder("b", 4_000_000),
    ]);
    expect(capitalTotal).toBe(10_000_000);
    expect(rows.map((row) => [row.id, row.share, row.amount])).toEqual([
      ["a", 60, 600_000],
      ["b", 40, 400_000],
    ]);
  });

  it("always adds up to exactly the amount split", () => {
    // Thirds of an amount that does not divide by three.
    const { rows } = splitByCapital(1_000_001, [
      holder("a", 1),
      holder("b", 1),
      holder("c", 1),
    ]);
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(1_000_001);
    expect(rows.map((row) => row.amount).sort()).toEqual([333_333, 333_334, 333_334]);
  });

  it("holds the total for awkward shares too", () => {
    const holders = [holder("a", 1_759_640), holder("b", 333_333), holder("c", 7)];
    for (const amount of [0, 1, 999, 1_234_567, 98_765_432]) {
      const { rows } = splitByCapital(amount, holders);
      expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(amount);
    }
  });

  it("leaves out members with nothing in the pot", () => {
    const { rows } = splitByCapital(100, [
      holder("a", 500),
      holder("b", 0),
      holder("c", -100),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a"]);
    expect(rows[0].amount).toBe(100);
  });

  it("splits nothing when nobody has put capital in", () => {
    expect(splitByCapital(500_000, [holder("a", 0)])).toEqual({
      rows: [],
      capitalTotal: 0,
    });
  });

  it("never hands out a negative margin", () => {
    const { rows } = splitByCapital(-50_000, [holder("a", 1), holder("b", 1)]);
    expect(rows.every((row) => row.amount === 0)).toBe(true);
  });

  it("is deterministic: the same inputs give the same rupiah to the same person", () => {
    const input = [holder("b", 1), holder("a", 1)];
    expect(splitByCapital(3, input)).toEqual(splitByCapital(3, [...input].reverse()));
  });
});
