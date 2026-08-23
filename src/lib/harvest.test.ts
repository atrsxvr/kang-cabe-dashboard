import { describe, expect, it } from "vitest";

import {
  averagePrice,
  formatKg,
  formatKgPrecise,
  actualPlantCount,
  formatPercent,
  formatPerPlant,
  gradeOutRate,
  mortalityRate,
  perPlantGrams,
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

describe("perPlantGrams", () => {
  it("is the yield one plant carried", () => {
    // 100 kg over 100 plants
    expect(perPlantGrams(100, 100)).toBe(1000);
  });

  /**
   * A season with no population recorded should say so, not print a zero that
   * reads like a failed harvest.
   */
  it("has no answer without a plant count", () => {
    expect(perPlantGrams(100, 0)).toBeNull();
  });
});

describe("formatPerPlant", () => {
  it("says kilos when a plant carried more than one", () => {
    expect(formatPerPlant(100, 100)).toBe("1 kg/pohon");
  });

  /** Where a chilli plant actually lives: 5.000 plants, 500 kg. */
  it("drops to grams below a kilo, which is the usual case", () => {
    expect(formatPerPlant(500, 5000)).toBe("100 g/pohon");
  });

  it("keeps a decimal when the number is small enough to need it", () => {
    expect(formatPerPlant(1, 40)).toBe("25 g/pohon");
    expect(formatPerPlant(0.5, 100)).toBe("5 g/pohon");
  });

  it("shows a dash rather than a misleading zero", () => {
    expect(formatPerPlant(100, 0)).toBe("—");
  });
});

describe("gradeOutRate", () => {
  it("is the share of the pick that was fit to sell", () => {
    expect(gradeOutRate({ GOOD: 87, REJECT: 13 })).toBeCloseTo(0.87, 5);
  });

  /** A ratio of nothing is not zero percent. */
  it("has no answer before anything is picked", () => {
    expect(gradeOutRate({ GOOD: 0, REJECT: 0 })).toBeNull();
  });

  it("is zero when the whole pick was rejected", () => {
    expect(gradeOutRate({ GOOD: 0, REJECT: 12 })).toBe(0);
  });
});

describe("actualPlantCount", () => {
  it("counts what is standing, not what went in", () => {
    expect(actualPlantCount(238, 12, 4)).toBe(230);
  });

  it("never goes below nothing, however the log reads", () => {
    expect(actualPlantCount(100, 500, 0)).toBe(0);
  });
});

describe("mortalityRate", () => {
  it("measures the loss against what was planted", () => {
    // 238 planted, 230 standing
    expect(mortalityRate(238, 230)).toBeCloseTo(0.0336, 4);
  });

  it("has no answer without a planting to measure against", () => {
    expect(mortalityRate(0, 0)).toBeNull();
  });

  /** Replanting past the original count is luck, not negative mortality. */
  it("does not go negative when replanting overshot", () => {
    expect(mortalityRate(100, 110)).toBe(0);
  });
});

describe("formatPercent", () => {
  it("writes a share the way it is read aloud", () => {
    expect(formatPercent(0.87)).toBe("87%");
    expect(formatPercent(0.0336, 1)).toBe("3,4%");
  });

  it("shows a dash rather than a misleading zero", () => {
    expect(formatPercent(null)).toBe("—");
  });
});
