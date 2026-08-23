import { describe, expect, it } from "vitest";

import { canCompareSeasons, comparableSeasons } from "@/lib/season-compare";

describe("comparableSeasons", () => {
  it("counts only seasons that have actually picked something", () => {
    expect(
      comparableSeasons([
        { harvestedKg: 104.21 },
        { harvestedKg: 0 },
        { harvestedKg: 51 },
      ])
    ).toBe(2);
  });

  /**
   * A planting still being prepared has no kilos to divide by, so it cannot
   * produce the figure at all. Counting it would let the card claim it has a
   * comparison while one side of it is blank.
   */
  it("does not count a season that has not started picking", () => {
    expect(comparableSeasons([{ harvestedKg: 0 }])).toBe(0);
  });
});

describe("canCompareSeasons", () => {
  /**
   * The regression this guards. The card is headed "antar musim" and the
   * per-kilo figure under it exists only to put two seasons side by side — so
   * with one season it printed a number whose entire purpose was missing, and
   * read as arithmetic nobody could account for. One is the boundary that
   * matters; getting it wrong by one either hides a working comparison or
   * shows a lone row under a promise it cannot keep.
   */
  it("is false while only one season has a harvest", () => {
    expect(canCompareSeasons([{ harvestedKg: 104.21 }])).toBe(false);
  });

  it("is false when a second season exists but has picked nothing", () => {
    expect(
      canCompareSeasons([{ harvestedKg: 104.21 }, { harvestedKg: 0 }])
    ).toBe(false);
  });

  it("is true as soon as a second season has picked something", () => {
    expect(
      canCompareSeasons([{ harvestedKg: 104.21 }, { harvestedKg: 0.5 }])
    ).toBe(true);
  });

  it("is false with no seasons at all", () => {
    expect(canCompareSeasons([])).toBe(false);
  });
});
