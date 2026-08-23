import { describe, expect, it } from "vitest";

import {
  formatRupiah,
  roundUpToCash,
  formatUnitPrice,
  nextAvgCost,
  rebuildAvgCost,
  stockValue,
  type CostMovement,
} from "@/lib/money";

const buy = (delta: number, totalCost: number | null): CostMovement => ({
  delta,
  reason: "PURCHASE",
  totalCost,
});

const use = (delta: number): CostMovement => ({
  delta,
  reason: "USAGE",
  totalCost: null,
});

describe("formatRupiah", () => {
  it("shows whole rupiah with Indonesian separators", () => {
    expect(formatRupiah(320000)).toContain("320.000");
  });

  it("rounds rather than showing cents", () => {
    expect(formatRupiah(1500.6)).toContain("1.501");
  });
});

describe("formatUnitPrice", () => {
  it("keeps two decimals for prices below a hundred rupiah", () => {
    expect(formatUnitPrice(32.5, "gram")).toContain("32,5");
  });

  it("drops decimals once the unit price is large enough not to need them", () => {
    expect(formatUnitPrice(160000, "sak")).toContain("160.000");
  });

  it("names the unit the price is per", () => {
    expect(formatUnitPrice(32, "gram")).toContain("/gram");
  });
});

describe("nextAvgCost", () => {
  it("sets the price on the first purchase, with nothing to average against", () => {
    expect(
      nextAvgCost({ stock: 0, avgCost: 0, addedQty: 10000, addedCost: 320000 })
    ).toBe(32);
  });

  it("weights the old stock against the new", () => {
    // 1000 @ 32 = 32.000, plus 1000 @ 40.000 → 72.000 over 2000 = 36
    expect(
      nextAvgCost({ stock: 1000, avgCost: 32, addedQty: 1000, addedCost: 40000 })
    ).toBe(36);
  });

  /** A purchase with no receipt yet must not drag the average to zero. */
  it("leaves the average alone when the price is not known yet", () => {
    expect(
      nextAvgCost({ stock: 1000, avgCost: 32, addedQty: 1000, addedCost: null })
    ).toBe(32);
  });
});

describe("stockValue", () => {
  it("values what is on the shelf at the average paid", () => {
    expect(stockValue(865, 32)).toBe(27680);
  });

  it("is zero for an empty shelf, whatever was paid before", () => {
    expect(stockValue(0, 32)).toBe(0);
  });
});

describe("rebuildAvgCost", () => {
  it("reproduces the running average from the log", () => {
    expect(rebuildAvgCost([buy(10000, 320000), use(-5000), buy(10000, 400000)]))
      // 5000 @ 32 = 160.000, plus 10000 @ 40 = 400.000 → 560.000 over 15000
      .toBeCloseTo(37.33, 2);
  });

  /**
   * The reason the average is stored at all is that it can be rebuilt: a price
   * typed in weeks late has to be able to correct what was already written.
   */
  it("changes once a missing price is filled in", () => {
    const before = rebuildAvgCost([buy(1000, 32000), buy(1000, null)]);
    const after = rebuildAvgCost([buy(1000, 32000), buy(1000, 60000)]);

    expect(before).toBe(32);
    expect(after).toBe(46);
  });

  it("does not let usage move the average", () => {
    expect(rebuildAvgCost([buy(1000, 32000), use(-900)])).toBe(32);
  });

  it("treats an opname that adds stock as arriving at the current average", () => {
    expect(
      rebuildAvgCost([
        buy(1000, 32000),
        { delta: 200, reason: "CORRECTION", totalCost: null },
      ])
    ).toBe(32);
  });

  it("is zero for a material nothing was ever paid for", () => {
    expect(rebuildAvgCost([buy(1000, null), use(-100)])).toBe(0);
  });
});

describe("roundUpToCash", () => {
  it("lifts an awkward total to the nearest 500", () => {
    expect(roundUpToCash(13250)).toBe(13500);
    expect(roundUpToCash(11250)).toBe(11500);
  });

  it("leaves a total that already lands on 500 alone", () => {
    expect(roundUpToCash(13500)).toBe(13500);
    expect(roundUpToCash(13000)).toBe(13000);
  });

  /** Always up: the difference is the seller's, not the buyer's. */
  it("never rounds down, even one rupiah short", () => {
    expect(roundUpToCash(13501)).toBe(14000);
    expect(roundUpToCash(1)).toBe(500);
  });

  it("leaves nothing as nothing", () => {
    expect(roundUpToCash(0)).toBe(0);
  });
});
