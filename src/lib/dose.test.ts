import { describe, expect, it } from "vitest";

import {
  amountForVolume,
  amountToInput,
  formatAmount,
  formatConcentration,
  parseAmount,
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

describe("parseAmount", () => {
  it("reads the comma decimal people actually type", () => {
    expect(parseAmount("37,5")).toBe(37.5);
  });

  it("still reads a dot decimal", () => {
    expect(parseAmount("37.5")).toBe(37.5);
  });

  it("ignores stray spaces", () => {
    expect(parseAmount(" 45 ")).toBe(45);
  });

  it("gives NaN for something that is not a number, so callers can check", () => {
    expect(Number.isFinite(parseAmount("dua sak"))).toBe(false);
    expect(Number.isFinite(parseAmount(""))).toBe(true); // "" coerces to 0
  });
});

describe("amountToInput", () => {
  /**
   * The bug this exists to stop: formatAmount groups thousands the Indonesian
   * way, so 1000 renders as "1.000" and parses back as 1 — a thousand bamboo
   * stakes silently becoming one.
   */
  it("survives a round trip through the text box", () => {
    for (const value of [1, 45, 135, 1000, 12500, 37.5, 0.5]) {
      expect(parseAmount(amountToInput(value))).toBe(value);
    }
  });

  it("does not group thousands", () => {
    expect(amountToInput(1000)).toBe("1000");
  });

  it("writes decimals with a comma, the way they are typed", () => {
    expect(amountToInput(37.5)).toBe("37,5");
  });
});
