import { describe, expect, it } from "vitest";

import {
  describeShortfall,
  formatStock,
  needsRestock,
  stockStatus,
} from "@/lib/stock";

describe("stockStatus", () => {
  it("is safe above the threshold", () => {
    expect(stockStatus(5000, 1000)).toBe("SAFE");
  });

  /** At the threshold, not just below it — the point is to buy before running out. */
  it("is low exactly at the threshold", () => {
    expect(stockStatus(1000, 1000)).toBe("LOW");
  });

  it("is low between zero and the threshold", () => {
    expect(stockStatus(500, 1000)).toBe("LOW");
  });

  it("is out of stock at zero", () => {
    expect(stockStatus(0, 1000)).toBe("OUT_OF_STOCK");
  });

  /** A negative should be impossible, but must not read as merely "low". */
  it("treats a negative balance as out of stock", () => {
    expect(stockStatus(-5, 1000)).toBe("OUT_OF_STOCK");
  });

  it("never flags a material with no threshold set until it hits zero", () => {
    expect(stockStatus(1, 0)).toBe("SAFE");
    expect(stockStatus(0, 0)).toBe("OUT_OF_STOCK");
  });
});

describe("needsRestock", () => {
  it("covers both low and empty", () => {
    expect(needsRestock(1000, 1000)).toBe(true);
    expect(needsRestock(0, 1000)).toBe(true);
    expect(needsRestock(1001, 1000)).toBe(false);
  });
});

describe("formatStock", () => {
  /**
   * Stock shares the recipe's unit so the two can be compared, which leaves
   * fertiliser counted in grams. Reading "5000 gram" off a shelf label is
   * worse than reading "5 kg".
   */
  it("scales grams up to kilograms once they get large", () => {
    expect(formatStock(5000, "gram")).toBe("5 kg");
  });

  it("scales millilitres up to litres", () => {
    expect(formatStock(2500, "ml")).toBe("2,5 liter");
  });

  it("leaves small amounts in their own unit", () => {
    expect(formatStock(90, "gram")).toBe("90 gram");
  });

  it("leaves units that do not scale alone", () => {
    expect(formatStock(3000, "pcs")).toBe("3.000 pcs");
  });

  it("does not scale exactly below the boundary", () => {
    expect(formatStock(999, "gram")).toBe("999 gram");
  });
});

describe("describeShortfall", () => {
  it("says HABIS rather than a quantity when empty", () => {
    expect(describeShortfall(0, 1000, "gram")).toBe("HABIS");
  });

  it("states what is left against the threshold", () => {
    expect(describeShortfall(500, 1000, "gram")).toBe(
      "sisa 500 gram (min 1 kg)"
    );
  });
});
