import { describe, expect, it } from "vitest";

import { netCapital, summariseCash, type CashEntry } from "@/lib/cash";

const entry = (
  id: string,
  date: string,
  source: CashEntry["source"],
  amount: number
): CashEntry => ({
  id,
  date: new Date(date),
  source,
  amount,
  label: id,
  detail: null,
});

describe("summariseCash", () => {
  it("adds what came in and takes away what went out", () => {
    const cash = summariseCash([
      entry("modal", "2026-09-01", "CAPITAL", 2_000_000),
      entry("jual", "2026-09-10", "SALE", 450_000),
      entry("lain", "2026-09-11", "OTHER_INCOME", 50_000),
      entry("pupuk", "2026-09-02", "PURCHASE", 300_000),
      entry("cangkul", "2026-09-03", "TOOL", 75_000),
      entry("upah", "2026-09-04", "EXPENSE", 100_000),
      entry("bagi", "2026-09-20", "PROFIT_SHARE", 200_000),
      entry("tarik", "2026-09-21", "CAPITAL_RETURN", 500_000),
    ]);

    expect(cash.totalIn).toBe(2_500_000);
    expect(cash.totalOut).toBe(1_175_000);
    expect(cash.balance).toBe(1_325_000);
    expect(cash.bySource.PURCHASE).toBe(300_000);
    expect(cash.bySource.PROFIT_SHARE).toBe(200_000);
  });

  it("starts at zero with nothing recorded", () => {
    const cash = summariseCash([]);
    expect(cash.balance).toBe(0);
    expect(cash.ledger).toEqual([]);
  });

  /**
   * Saldo berjalan ada untuk menelusuri selisih dengan uang di tangan. Ia cuma
   * berguna kalau tiap baris menunjukkan saldo sesudah baris itu, dihitung
   * menurut waktu — bukan menurut urutan catatannya diketik.
   */
  it("carries a running balance in date order, newest first", () => {
    const cash = summariseCash([
      entry("b", "2026-09-05", "PURCHASE", 300_000),
      entry("a", "2026-09-01", "CAPITAL", 1_000_000),
      entry("c", "2026-09-09", "SALE", 200_000),
    ]);

    expect(cash.ledger.map((row) => [row.id, row.balanceAfter])).toEqual([
      ["c", 900_000],
      ["b", 700_000],
      ["a", 1_000_000],
    ]);
    expect(cash.ledger[1].direction).toBe("OUT");
  });

  /** Setoran dan belanja di hari yang sama: setorannya yang membiayai. */
  it("puts money in before money out on the same day", () => {
    const cash = summariseCash([
      entry("belanja", "2026-09-01", "PURCHASE", 300_000),
      entry("setor", "2026-09-01", "CAPITAL", 300_000),
    ]);

    expect(cash.ledger.map((row) => row.balanceAfter)).toEqual([0, 300_000]);
  });

  it("is allowed to go negative, and says so", () => {
    // Belanja yang dicatat sebelum setorannya diketik. Menyembunyikannya akan
    // menyembunyikan catatan yang kurang.
    const cash = summariseCash([entry("pupuk", "2026-09-01", "PURCHASE", 1)]);
    expect(cash.balance).toBe(-1);
  });
});

describe("netCapital", () => {
  it("subtracts only what was taken back", () => {
    expect(netCapital(2_000_000, 500_000)).toBe(1_500_000);
    expect(netCapital(2_000_000, 0)).toBe(2_000_000);
  });
});
