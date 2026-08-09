import { describe, expect, it } from "vitest";

import {
  amountForVolume,
  formatAmount,
  formatConcentration,
  safeHarvestDate,
} from "@/lib/dose";

const npk = { amountPerLiter: 2, material: { name: "NPK 16-16-16", unit: "gram" } };
const humat = { amountPerLiter: 1, material: { name: "Asam Humat", unit: "gram" } };

describe("amountForVolume", () => {
  /**
   * The reference recipe from the garden: 45 L carrying 90 g of NPK and 45 g of
   * humic acid. Stored per litre, it has to reproduce those figures exactly.
   */
  it("reproduces the 45 litre batch it was derived from", () => {
    expect(amountForVolume(npk, 45)).toBe(90);
    expect(amountForVolume(humat, 45)).toBe(45);
  });

  it("scales down to a borrowed 16 litre sprayer", () => {
    expect(amountForVolume(npk, 16)).toBe(32);
  });

  it("handles a half tank", () => {
    expect(amountForVolume(npk, 22.5)).toBe(45);
  });

  it("returns zero for zero volume rather than anything surprising", () => {
    expect(amountForVolume(npk, 0)).toBe(0);
  });
});

describe("formatAmount", () => {
  it("keeps one decimal for small doses, which a 0.5 ml/L rate needs", () => {
    expect(formatAmount(7.5)).toBe("7,5");
  });

  it("rounds away floating point noise", () => {
    expect(formatAmount(0.1 * 3 * 100)).toBe("30");
  });

  it("drops decimals once the number is large enough not to need them", () => {
    expect(formatAmount(1234.56)).toBe("1.235");
  });
});

describe("formatConcentration", () => {
  it("states the per-litre rate with the material's own unit", () => {
    expect(formatConcentration(npk)).toBe("2 gram/L");
  });
});

describe("safeHarvestDate", () => {
  /**
   * The garden harvests continuously, so the useful question is not whether a
   * spray is allowed but when picking may resume.
   */
  it("adds the waiting period to the application date", () => {
    const applied = new Date("2026-08-09T02:00:00Z");
    const safe = safeHarvestDate(applied, 7);
    expect(safe?.toISOString().slice(0, 10)).toBe("2026-08-16");
  });

  it("returns null when the recipe has no waiting period", () => {
    expect(safeHarvestDate(new Date(), null)).toBeNull();
  });

  it("treats a zero-day interval as no restriction", () => {
    expect(safeHarvestDate(new Date(), 0)).toBeNull();
  });
});
