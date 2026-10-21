import { describe, expect, it } from "vitest";

import {
  canCloseSeason,
  closingChecklist,
  type ClosingFacts,
} from "@/lib/season-close";

const settled: ClosingFacts = {
  unrecordedUsageTasks: 0,
  unpricedUsages: 0,
  unpricedPurchases: 0,
  unpaidSales: 0,
  unpaidAmount: 0,
  unsoldKg: 0,
  unsoldValue: 0,
  capitalTotal: 1_000_000,
};

const format = {
  rupiah: (value: number) => `Rp ${value}`,
  kg: (value: number) => `${value} kg`,
};

const check = (facts: Partial<ClosingFacts>, key: string) =>
  closingChecklist({ ...settled, ...facts }, "s1", format).find(
    (item) => item.key === key
  )!;

describe("closingChecklist", () => {
  it("is all clear for a settled season", () => {
    expect(
      closingChecklist(settled, "s1", format).every((item) => item.ok)
    ).toBe(true);
  });

  it("flags each way the margin can be wrong", () => {
    expect(check({ unrecordedUsageTasks: 2 }, "usage").ok).toBe(false);
    expect(check({ unpricedUsages: 1 }, "unpriced-usage").ok).toBe(false);
    expect(check({ unpricedPurchases: 3 }, "unpriced-purchase").ok).toBe(false);
    expect(check({ unpaidSales: 1, unpaidAmount: 750000 }, "unpaid").title).toBe(
      "1 penjualan belum lunas (Rp 750000)"
    );
    expect(check({ unsoldKg: 3, unsoldValue: 90000 }, "unsold").ok).toBe(false);
  });

  it("ignores a rounding crumb of unsold chilli", () => {
    expect(check({ unsoldKg: 0.05 }, "unsold").ok).toBe(true);
  });

  it("needs capital in the pot, since the split is by capital", () => {
    expect(check({ capitalTotal: 0 }, "capital").ok).toBe(false);
    expect(check({ capitalTotal: 1 }, "capital").ok).toBe(true);
  });

  it("links to where each is settled, carrying the season", () => {
    expect(check({}, "usage").href).toBe("/tasks?season=s1");
    expect(check({}, "unpaid").href).toBe("/harvest?season=s1");
    expect(check({}, "capital").href).toBe("/finance?season=s1");
  });
});

describe("canCloseSeason", () => {
  it("closes a settled season", () => {
    expect(canCloseSeason(closingChecklist(settled, "s1", format))).toBe(true);
  });

  it("refuses while anything at all is unsettled", () => {
    for (const loose of [
      { unrecordedUsageTasks: 1 },
      { unpricedUsages: 1 },
      { unpricedPurchases: 1 },
      { unpaidSales: 1, unpaidAmount: 500 },
      { unsoldKg: 1, unsoldValue: 30000 },
      { capitalTotal: 0 },
    ]) {
      expect(
        canCloseSeason(closingChecklist({ ...settled, ...loose }, "s1", format)),
        JSON.stringify(loose)
      ).toBe(false);
    }
  });
});
