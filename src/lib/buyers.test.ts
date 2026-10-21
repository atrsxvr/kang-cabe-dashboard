import { describe, expect, it } from "vitest";

import {
  buyerIncomplete,
  buyerTotals,
  sameBuyerName,
  waNumber,
} from "@/lib/buyers";

describe("waNumber", () => {
  it("turns the ways numbers are written here into 62…", () => {
    expect(waNumber("0812-3456-7890")).toBe("6281234567890");
    expect(waNumber("+62 812 3456 7890")).toBe("6281234567890");
    expect(waNumber("6281234567890")).toBe("6281234567890");
    expect(waNumber("81234567890")).toBe("6281234567890");
  });

  it("is null for nothing, or for something too short to dial", () => {
    expect(waNumber("")).toBeNull();
    expect(waNumber(null)).toBeNull();
    expect(waNumber("0812")).toBeNull();
  });
});

describe("buyerIncomplete", () => {
  it("flags a buyer brought over without location or kind", () => {
    expect(buyerIncomplete({ location: null, kind: null })).toBe(true);
    expect(buyerIncomplete({ location: "Cisarua", kind: null })).toBe(true);
    expect(buyerIncomplete({ location: "  ", kind: "PASAR" })).toBe(true);
    expect(buyerIncomplete({ location: "Cisarua", kind: "PASAR" })).toBe(false);
  });
});

describe("buyerTotals", () => {
  const day = (d: number) => new Date(`2026-06-${String(d).padStart(2, "0")}T03:00:00Z`);

  it("sums what was paid, each sale rounded up to Rp 500 as it was handed over", () => {
    const totals = buyerTotals([
      // 1,25 × 30.123 = 37.653,75 → 37.654 → paid 38.000
      { soldAt: day(1), items: [{ grade: "GOOD", weightKg: 1.25, pricePerKg: 30123 }] },
      { soldAt: day(5), items: [{ grade: "GOOD", weightKg: 2, pricePerKg: 25000 }] },
    ]);
    expect(totals.totalAmount).toBe(38_000 + 50_000);
    expect(totals.saleCount).toBe(2);
    expect(totals.lastSoldAt).toEqual(day(5));
  });

  it("averages the price of Bagus only, weighted by kilos", () => {
    const totals = buyerTotals([
      {
        soldAt: day(1),
        items: [
          { grade: "GOOD", weightKg: 10, pricePerKg: 40000 },
          { grade: "REJECT", weightKg: 5, pricePerKg: 10000 },
        ],
      },
      { soldAt: day(2), items: [{ grade: "GOOD", weightKg: 30, pricePerKg: 20000 }] },
    ]);
    // (10 × 40.000 + 30 × 20.000) ÷ 40 kg — afkir left out.
    expect(totals.averageGoodPrice).toBe(25_000);
    expect(totals.goodKg).toBe(40);
    expect(totals.totalKg).toBe(45);
  });

  it("has no average for a buyer who only ever took afkir", () => {
    expect(
      buyerTotals([
        { soldAt: day(1), items: [{ grade: "REJECT", weightKg: 3, pricePerKg: 8000 }] },
      ]).averageGoodPrice
    ).toBeNull();
  });

  it("is empty for a buyer with no sales yet", () => {
    expect(buyerTotals([])).toMatchObject({
      saleCount: 0,
      totalAmount: 0,
      averageGoodPrice: null,
      lastSoldAt: null,
    });
  });
});

describe("sameBuyerName", () => {
  it("ignores case and spacing, but not spelling", () => {
    expect(sameBuyerName("Pak Ujang", "pak  ujang ")).toBe(true);
    expect(sameBuyerName("Pak Ujang", "Pak Ujan")).toBe(false);
  });
});
