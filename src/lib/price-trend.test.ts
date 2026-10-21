import { describe, expect, it } from "vitest";

import { priceTrend, type PriceSale } from "@/lib/price-trend";

const sale = (
  soldAt: string,
  buyer: string,
  items: PriceSale["items"]
): PriceSale => ({ soldAt: new Date(soldAt), buyer: { name: buyer }, items });

describe("priceTrend", () => {
  it("weighs a day's price by kilos, as the season average does", () => {
    // 10 kg × 30.000 + 2 kg × 24.000 = 348.000 over 12 kg = 29.000.
    const [day] = priceTrend([
      sale("2026-06-02T02:00:00Z", "Pak A", [{ grade: "GOOD", weightKg: 10, pricePerKg: 30000 }]),
      sale("2026-06-02T05:00:00Z", "Bu B", [{ grade: "GOOD", weightKg: 2, pricePerKg: 24000 }]),
    ]);

    expect(day).toEqual({
      day: "2026-06-02",
      kg: 12,
      price: 29000,
      low: 24000,
      high: 30000,
      buyers: ["Pak A", "Bu B"],
    });
  });

  it("leaves afkir out, even when it sold", () => {
    const points = priceTrend([
      sale("2026-06-02T02:00:00Z", "Pak A", [
        { grade: "GOOD", weightKg: 5, pricePerKg: 30000 },
        { grade: "REJECT", weightKg: 5, pricePerKg: 8000 },
      ]),
      sale("2026-06-03T02:00:00Z", "Pak A", [{ grade: "REJECT", weightKg: 3, pricePerKg: 8000 }]),
    ]);

    expect(points).toHaveLength(1);
    expect(points[0].price).toBe(30000);
    expect(points[0].kg).toBe(5);
  });

  it("groups by the day in Jakarta, not in UTC", () => {
    // 17.30 UTC on the 1st is 00.30 WIB on the 2nd.
    const points = priceTrend([
      sale("2026-06-01T17:30:00Z", "Pak A", [{ grade: "GOOD", weightKg: 1, pricePerKg: 25000 }]),
      sale("2026-06-02T09:00:00Z", "Pak A", [{ grade: "GOOD", weightKg: 1, pricePerKg: 27000 }]),
    ]);

    expect(points.map((point) => point.day)).toEqual(["2026-06-02"]);
    expect(points[0].price).toBe(26000);
  });

  it("runs oldest first, whatever order the sales arrive in", () => {
    // listSales returns newest first.
    const points = priceTrend([
      sale("2026-06-09T02:00:00Z", "Pak A", [{ grade: "GOOD", weightKg: 1, pricePerKg: 20000 }]),
      sale("2026-06-02T02:00:00Z", "Pak A", [{ grade: "GOOD", weightKg: 1, pricePerKg: 30000 }]),
    ]);

    expect(points.map((point) => point.day)).toEqual(["2026-06-02", "2026-06-09"]);
  });

  it("names a buyer once however many sales they made that day", () => {
    const [day] = priceTrend([
      sale("2026-06-02T02:00:00Z", "Pak A", [{ grade: "GOOD", weightKg: 1, pricePerKg: 25000 }]),
      sale("2026-06-02T06:00:00Z", "Pak A", [{ grade: "GOOD", weightKg: 1, pricePerKg: 25000 }]),
    ]);

    expect(day.buyers).toEqual(["Pak A"]);
  });

  it("is empty with nothing sold", () => {
    expect(priceTrend([])).toEqual([]);
  });
});
