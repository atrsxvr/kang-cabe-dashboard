import { describe, expect, it } from "vitest";

import {
  averagePrice,
  formatKg,
  formatKgPrecise,
  lineTotal,
  totalOf,
  unsoldBalance,
} from "@/lib/harvest";

describe("formatKg", () => {
  it("keeps a decimal the scale actually reads", () => {
    expect(formatKg(12.5)).toBe("12,5 kg");
  });

  /**
   * A quarter kilo is a real sale. Rounding it to 0,3 would overstate what
   * left and disagree with the money the buyer handed over.
   */
  it("keeps a quarter kilo whole instead of rounding it up", () => {
    expect(formatKg(0.25)).toBe("0,25 kg");
  });

  it("does not print a decimal that is not there", () => {
    expect(formatKg(20)).toBe("20 kg");
  });
});

describe("formatKgPrecise", () => {
  it("always shows both decimals, so a column of totals lines up", () => {
    expect(formatKgPrecise(25.5)).toBe("25,50 kg");
    expect(formatKgPrecise(20)).toBe("20,00 kg");
  });

  it("still keeps the quarter", () => {
    expect(formatKgPrecise(0.25)).toBe("0,25 kg");
  });
});

describe("totalOf", () => {
  it("adds the grades rather than trusting a stored total", () => {
    expect(totalOf({ GOOD: 18, REJECT: 4.5 })).toBe(22.5);
  });
});

describe("unsoldBalance", () => {
  it("is what is picked less what is sold, per grade", () => {
    expect(
      unsoldBalance({ GOOD: 50, REJECT: 12 }, { GOOD: 30, REJECT: 12 })
    ).toEqual({ GOOD: 20, REJECT: 0 });
  });

  /**
   * The two sides are recorded days apart and in either order, so a sale ahead
   * of its harvest is a reminder that a picking is unwritten — not something
   * to refuse.
   */
  it("goes negative rather than hiding a harvest nobody wrote down", () => {
    expect(unsoldBalance({ GOOD: 0, REJECT: 0 }, { GOOD: 8, REJECT: 0 })).toEqual(
      { GOOD: -8, REJECT: 0 }
    );
  });
});

describe("lineTotal", () => {
  it("multiplies weight by price and lands on whole rupiah", () => {
    expect(lineTotal(12.5, 45000)).toBe(562500);
  });

  it("rounds a fractional kilo rather than carrying centavos", () => {
    expect(lineTotal(0.333, 30000)).toBe(9990);
  });
});

describe("averagePrice", () => {
  it("reports what was actually got per kilo across grades", () => {
    // 20 kg at 45.000 plus 5 kg at 15.000 = 975.000 over 25 kg
    expect(averagePrice(975000, 25)).toBe(39000);
  });

  it("is zero rather than infinite when nothing was sold", () => {
    expect(averagePrice(0, 0)).toBe(0);
  });
});
