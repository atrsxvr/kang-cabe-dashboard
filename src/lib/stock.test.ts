import { describe, expect, it } from "vitest";

import {
  canDeleteMaterial,
  describeShortfall,
  expiryStatus,
  formatStock,
  isDosable,
  needsRestock,
  priceBases,
  restockSuggestion,
  stockStatus,
  totalFromUnitPrice,
  unitLocked,
  unitPriceFromTotal,
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

describe("formatStock beside another figure", () => {
  it("follows the larger figure, so a pair never mixes gram and kg", () => {
    expect(formatStock(100, "gram", 1000)).toBe("0,1 kg");
    expect(formatStock(1000, "gram", 1000)).toBe("1 kg");
    expect(formatStock(100, "gram", 500)).toBe("100 gram");
  });
});

describe("unitLocked", () => {
  it("frees the unit only while nothing has been written in it", () => {
    const none = { recipeItems: 0, movements: 0, taskUsages: 0 };
    expect(unitLocked(none)).toBe(false);
    expect(unitLocked({ ...none, movements: 1 })).toBe(true);
    expect(unitLocked({ ...none, recipeItems: 1 })).toBe(true);
    expect(unitLocked({ ...none, taskUsages: 1 })).toBe(true);
  });
});

describe("describeShortfall", () => {
  it("says HABIS rather than a quantity when empty", () => {
    expect(describeShortfall(0, 1000, "gram")).toBe("HABIS");
  });

  it("states what is left against the threshold", () => {
    expect(describeShortfall(500, 1000, "gram")).toBe(
      "sisa 0,5 kg (min 1 kg)"
    );
  });
});

describe("restockSuggestion", () => {
  it("names whole packs, enough to clear the threshold", () => {
    // 100 g left, line at 200 g, sold in 1 kg bags.
    expect(restockSuggestion(100, 200, "gram", "bungkus", 1000)).toEqual({
      text: "beli 1 bungkus (1 kg)",
      amount: 1000,
    });
  });

  it("clears the line rather than landing on it", () => {
    // Short by exactly one sack: one sack would leave it Menipis again.
    expect(restockSuggestion(0, 5000, "gram", "sak", 5000).amount).toBe(10000);
    // Sitting exactly on the line is already Menipis, so one pack is due.
    expect(restockSuggestion(200, 200, "gram", "bungkus", 1000).amount).toBe(
      1000
    );
  });

  it("buys enough packs that stock ends above the threshold", () => {
    for (const [stock, min, size] of [
      [100, 200, 1000],
      [0, 5000, 5000],
      [300, 2500, 500],
      [2499, 2500, 500],
    ]) {
      const { amount } = restockSuggestion(stock, min, "gram", "pak", size);
      expect(stock + amount!).toBeGreaterThan(min);
    }
  });

  it("says 'more than' without a pack, and pre-fills nothing", () => {
    expect(restockSuggestion(500, 2000, "gram", null, null)).toEqual({
      text: "beli lebih dari 1,5 kg",
      amount: null,
    });
    // In the same scale as "sisa 0,01 kg (min 1 kg)" beside it.
    expect(restockSuggestion(10, 1000, "gram", null, null).text).toBe(
      "beli lebih dari 0,99 kg"
    );
    expect(restockSuggestion(200, 200, "gram", null, null).text).toContain(
      "tepat di batas"
    );
  });

  it("ignores a nonsense pack size rather than dividing by zero", () => {
    expect(restockSuggestion(0, 5000, "gram", "sak", 0).amount).toBeNull();
  });
});

describe("expiryStatus", () => {
  const today = new Date("2026-08-15T03:00:00Z");

  it("says nothing for a material with no date", () => {
    expect(expiryStatus(null, today)).toBe("NONE");
  });

  it("warns a month ahead", () => {
    expect(expiryStatus(new Date("2026-09-10T00:00:00Z"), today)).toBe("SOON");
  });

  it("stays quiet further out than that", () => {
    expect(expiryStatus(new Date("2026-12-01T00:00:00Z"), today)).toBe("OK");
  });

  it("flags one that has already passed", () => {
    expect(expiryStatus(new Date("2026-08-01T00:00:00Z"), today)).toBe(
      "EXPIRED"
    );
  });

  it("counts today itself as still usable", () => {
    expect(expiryStatus(new Date("2026-08-15T00:00:00Z"), today)).toBe("SOON");
  });
});

describe("isDosable", () => {
  it("offers what goes into a tank, and not what is spread by the sack", () => {
    const tank = ["BOOSTER", "BIOLOGICAL", "INSECTICIDE", "ACARICIDE", "ADHESIVE"];
    for (const category of tank) {
      expect(isDosable(category), category).toBe(true);
    }
    expect(isDosable("AMELIORANT")).toBe(false);
    expect(isDosable("MULCH")).toBe(false);
  });
});

describe("canDeleteMaterial", () => {
  const none = { recipeItems: 0, movements: 0, taskUsages: 0 };

  it("deletes a registration that went nowhere", () => {
    expect(canDeleteMaterial(none, false)).toBe(true);
  });

  it("still deletes when the only movement is the opening count", () => {
    expect(canDeleteMaterial({ ...none, movements: 1 }, true)).toBe(true);
  });

  it("archives once anything else has happened to it", () => {
    expect(canDeleteMaterial({ ...none, movements: 2 }, true)).toBe(false);
    // One movement that is not the opening — a purchase.
    expect(canDeleteMaterial({ ...none, movements: 1 }, false)).toBe(false);
    expect(canDeleteMaterial({ ...none, recipeItems: 1 }, false)).toBe(false);
    expect(canDeleteMaterial({ ...none, taskUsages: 1 }, false)).toBe(false);
  });
});

describe("prices quoted the way the shop quotes them", () => {
  it("offers per kg and per gram for grams, per liter and per ml for ml", () => {
    expect(priceBases("gram")).toEqual([
      { label: "kg", per: 1000 },
      { label: "gram", per: 1 },
    ]);
    expect(priceBases("ml")).toEqual([
      { label: "liter", per: 1000 },
      { label: "ml", per: 1 },
    ]);
  });

  it("prices anything else per itself", () => {
    expect(priceBases("pcs")).toEqual([{ label: "pcs", per: 1 }]);
  });

  it("turns Rp 25.000 per kg for 200 gram into Rp 5.000", () => {
    expect(totalFromUnitPrice(25_000, 200, 1000)).toBe(5_000);
  });

  it("takes a maker's price per ml as it is", () => {
    // Rp 150/ml, 250 ml bottle.
    expect(totalFromUnitPrice(150, 250, 1)).toBe(37_500);
  });

  it("rounds to whole rupiah", () => {
    expect(totalFromUnitPrice(25_000, 333, 1000)).toBe(8_325);
    expect(totalFromUnitPrice(99_999, 0.5, 1000)).toBe(50);
  });

  it("reads a total back as a price per quoted unit", () => {
    expect(unitPriceFromTotal(5_000, 200, 1000)).toBe(25_000);
    expect(unitPriceFromTotal(37_500, 250, 1)).toBe(150);
    // The mistake this exists to show: the per-kg price typed as the total.
    expect(unitPriceFromTotal(25_000, 200, 1000)).toBe(125_000);
    expect(unitPriceFromTotal(5_000, 0, 1000)).toBeNull();
  });
});
