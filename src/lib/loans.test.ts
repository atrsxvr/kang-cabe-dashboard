import { describe, expect, it } from "vitest";

import { loanOffset, outstandingByMember } from "@/lib/loans";

describe("outstandingByMember", () => {
  it("menjumlah pinjaman dan mengurangi pengembalian per orang", () => {
    const balances = outstandingByMember([
      { userId: "asep", type: "LENT", amount: 500_000 },
      { userId: "asep", type: "REPAID", amount: 200_000 },
      { userId: "ujang", type: "LENT", amount: 100_000 },
    ]);
    expect(balances.get("asep")).toBe(300_000);
    expect(balances.get("ujang")).toBe(100_000);
  });

  it("yang sudah lunas tidak muncul lagi", () => {
    const balances = outstandingByMember([
      { userId: "asep", type: "LENT", amount: 500_000 },
      { userId: "asep", type: "REPAID", amount: 500_000 },
    ]);
    expect(balances.has("asep")).toBe(false);
  });
});

describe("loanOffset", () => {
  it("memotong sebesar sisa pinjaman kalau jatahnya cukup", () => {
    expect(loanOffset(300_000, 1_000_000)).toBe(300_000);
  });

  it("memotong seluruh jatah kalau pinjamannya lebih besar", () => {
    expect(loanOffset(2_000_000, 1_000_000)).toBe(1_000_000);
  });

  it("tidak memotong apa pun tanpa pinjaman", () => {
    expect(loanOffset(0, 1_000_000)).toBe(0);
  });
});
