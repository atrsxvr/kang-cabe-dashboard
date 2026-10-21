import { describe, expect, it } from "vitest";

import { isLaborEntry, laborBreakdown } from "@/lib/labor";

// formatRupiah puts a non-breaking space after "Rp".
const rp = (text: string) => text.replace(/ /g, " ");

describe("isLaborEntry", () => {
  it("is a wage only when money goes out under Upah", () => {
    expect(isLaborEntry("EXPENSE", "Upah")).toBe(true);
    expect(isLaborEntry("INCOME", "Upah")).toBe(false);
    expect(isLaborEntry("EXPENSE", "Sewa")).toBe(false);
  });
});

describe("laborBreakdown", () => {
  it("sums by job, biggest first", () => {
    expect(
      rp(
        laborBreakdown([
          { laborJob: "Cabut tanam", amount: 600_000 },
          { laborJob: "Olah lahan", amount: 1_000_000 },
          { laborJob: "olah lahan ", amount: 500_000 },
        ])
      )
    ).toBe("olah lahan Rp 1.500.000 · cabut tanam Rp 600.000");
  });

  it("names wages recorded before the job was asked for", () => {
    expect(rp(laborBreakdown([{ laborJob: null, amount: 200_000 }]))).toBe(
      "lainnya Rp 200.000"
    );
  });

  it("is empty when there are no wages", () => {
    expect(laborBreakdown([])).toBe("");
  });
});
