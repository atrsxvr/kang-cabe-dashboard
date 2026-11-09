import { describe, expect, it } from "vitest";

import {
  INCOME_CATEGORY,
  canArchiveSeason,
  createFinanceEntrySchema,
  createMaterialSchema,
  createOpeningSchema,
  createPayoutSchema,
  createSeasonSchema,
  createTaskSchema,
  expenseCategories,
  nextSeasonStatus,
  previousSeasonStatus,
  recordPurchaseSchema,
  recordTaskUsageSchema,
  stockOpnameSchema,
  updateMaterialSchema,
  updatePayoutSchema,
  updateTaskStatusSchema,
} from "@/server/actions/schemas";

const validSeason = {
  name: "Musim Tanam 2",
  variety: "Rawit Ori 212",
  plantCount: "5000",
  gardenId: "lahan-1",
  sprayTankLitres: "16",
  kocorTankLitres: "20",
  startDate: "2026-08-01",
  status: "PLANNING",
  notes: "",
};

describe("createSeasonSchema", () => {
  /** Selesai only through Tutup Musim's checklist; Arsip only through Arsipkan. */
  it("refuses a new season that starts out closed or archived", () => {
    for (const status of ["COMPLETED", "ARCHIVED"]) {
      expect(createSeasonSchema.safeParse({ ...validSeason, status }).success, status).toBe(
        false
      );
    }
    expect(createSeasonSchema.safeParse({ ...validSeason, status: "ACTIVE" }).success).toBe(
      true
    );
  });

  it("needs a lahan, and tanks of some size", () => {
    expect(createSeasonSchema.safeParse({ ...validSeason, gardenId: "" }).success).toBe(false);
    expect(createSeasonSchema.safeParse({ ...validSeason, kocorTankLitres: "0" }).success).toBe(
      false
    );
  });

  it("reads a tank written with a comma", () => {
    expect(createSeasonSchema.parse({ ...validSeason, sprayTankLitres: "16,5" }).sprayTankLitres).toBe(
      16.5
    );
  });

  it("coerces the string values a FormData submit produces", () => {
    const parsed = createSeasonSchema.parse(validSeason);
    expect(parsed.plantCount).toBe(5000);
    expect(parsed.startDate).toBeInstanceOf(Date);
  });

  /**
   * Proyeksi panen boleh kosong, dan kosong harus jadi null — bukan nol.
   * Nol akan terbaca "musim ini tidak diharapkan panen apa pun" lalu dipakai
   * sebagai penyebut BEP, yang menghasilkan harga lantai tak terhingga.
   */
  it("treats an untouched projection as null, not as a number", () => {
    expect(createSeasonSchema.parse(validSeason).projectedHarvestKg).toBeNull();

    expect(
      createSeasonSchema.parse({ ...validSeason, projectedHarvestKg: "" })
        .projectedHarvestKg
    ).toBeNull();

    expect(
      createSeasonSchema.parse({ ...validSeason, projectedHarvestKg: null })
        .projectedHarvestKg
    ).toBeNull();
  });

  it("reads a projection written with a comma", () => {
    expect(
      createSeasonSchema.parse({ ...validSeason, projectedHarvestKg: "131,4" })
        .projectedHarvestKg
    ).toBe(131.4);
  });

  it("rejects a projection of zero rather than dividing by it", () => {
    expect(
      createSeasonSchema.safeParse({
        ...validSeason,
        projectedHarvestKg: "0",
      }).success
    ).toBe(false);
  });

  it("rejects a population of zero", () => {
    const result = createSeasonSchema.safeParse({
      ...validSeason,
      plantCount: "0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fractional population", () => {
    expect(
      createSeasonSchema.safeParse({ ...validSeason, plantCount: "12.5" })
        .success
    ).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(
      createSeasonSchema.safeParse({ ...validSeason, status: "SELESAI" }).success
    ).toBe(false);
  });

  it("trims whitespace-only names rather than accepting them", () => {
    expect(
      createSeasonSchema.safeParse({ ...validSeason, name: "   " }).success
    ).toBe(false);
  });
});

const validTask = {
  seasonId: "season-1",
  title: "Semprot fungisida",
  description: "",
  dueDate: "2026-08-10",
  status: "TODO",
  assigneeIds: [],
};

describe("createTaskSchema", () => {
  it("accepts a task with no assignees", () => {
    expect(createTaskSchema.parse(validTask).assigneeIds).toEqual([]);
  });

  it("accepts several assignees, matching the many-to-many schema", () => {
    const parsed = createTaskSchema.parse({
      ...validTask,
      assigneeIds: ["u1", "u2"],
    });
    expect(parsed.assigneeIds).toHaveLength(2);
  });

  /** seasonId is what keeps a task inside its season; it can never be blank. */
  it("rejects a missing seasonId", () => {
    expect(
      createTaskSchema.safeParse({ ...validTask, seasonId: "" }).success
    ).toBe(false);
  });

  it("rejects a negative HST", () => {
    expect(createTaskSchema.safeParse({ ...validTask, hst: "-1" }).success).toBe(
      false
    );
  });

  it("treats HST as optional", () => {
    expect(createTaskSchema.parse(validTask).hst).toBeUndefined();
  });

  it("defaults to no materials, so a plain task carries no stock claim", () => {
    expect(createTaskSchema.parse(validTask).materials).toEqual([]);
  });

  it("coerces the copied amounts the recipe picker sends", () => {
    const parsed = createTaskSchema.parse({
      ...validTask,
      recipeId: "r1",
      recipeVolumeL: "45",
      materials: [{ materialId: "m1", amount: "135" }],
    });

    expect(parsed.recipeVolumeL).toBe(45);
    expect(parsed.materials).toEqual([{ materialId: "m1", amount: 135 }]);
  });

  /** A zero-amount line would deduct nothing while looking like it did. */
  it("rejects a material with a zero amount", () => {
    expect(
      createTaskSchema.safeParse({
        ...validTask,
        materials: [{ materialId: "m1", amount: "0" }],
      }).success
    ).toBe(false);
  });
});

describe("recordTaskUsageSchema", () => {
  it("requires a seasonId so the deduction cannot reach another season", () => {
    expect(recordTaskUsageSchema.safeParse({ taskId: "t1" }).success).toBe(
      false
    );
  });

  it("treats the actor as optional", () => {
    const parsed = recordTaskUsageSchema.parse({
      taskId: "t1",
      seasonId: "s1",
    });
    expect(parsed.actorId).toBeUndefined();
  });
});

describe("stockOpnameSchema", () => {
  it("coerces counted amounts and allows a genuine zero", () => {
    const parsed = stockOpnameSchema.parse({
      actorId: "",
      note: "",
      counts: [{ materialId: "m1", counted: "0" }],
    });
    expect(parsed.counts[0].counted).toBe(0);
  });

  it("rejects a negative count — a shelf cannot hold less than nothing", () => {
    expect(
      stockOpnameSchema.safeParse({
        counts: [{ materialId: "m1", counted: "-1" }],
      }).success
    ).toBe(false);
  });

  it("rejects an opname with nothing counted", () => {
    expect(stockOpnameSchema.safeParse({ counts: [] }).success).toBe(false);
  });
});

describe("updateTaskStatusSchema", () => {
  it("requires a seasonId so the update cannot reach another season", () => {
    expect(
      updateTaskStatusSchema.safeParse({ taskId: "t1", status: "DONE" }).success
    ).toBe(false);
  });
});

describe("nextSeasonStatus", () => {
  it("walks the lifecycle forward", () => {
    expect(nextSeasonStatus("PLANNING")).toBe("ACTIVE");
    expect(nextSeasonStatus("ACTIVE")).toBe("HARVESTING");
    expect(nextSeasonStatus("HARVESTING")).toBe("COMPLETED");
  });

  it("stops at the end instead of wrapping", () => {
    expect(nextSeasonStatus("COMPLETED")).toBeNull();
  });

  it("treats ARCHIVED as outside the progression", () => {
    expect(nextSeasonStatus("ARCHIVED")).toBeNull();
  });
});

describe("material schemas", () => {
  const validMaterial = {
    name: "NPK 16-16-16",
    unit: "gram",
    category: "FERTILIZER",
    stock: "5000",
    minStock: "1000",
    notes: "",
  };

  it("accepts an opening balance when the material is registered", () => {
    expect(createMaterialSchema.parse(validMaterial).stock).toBe(5000);
  });

  /**
   * Editing must not be a way around the movement log — the quantity only
   * moves through +/−, a recorded task, or an opname.
   */
  it("drops stock from an edit even when the form sends it", () => {
    const parsed = updateMaterialSchema.parse({
      ...validMaterial,
      materialId: "m1",
      stock: "999999",
    });

    expect("stock" in parsed).toBe(false);
    expect(parsed.minStock).toBe(1000);
  });
});

describe("payout schemas", () => {
  const base = {
    userId: "u1",
    amount: "500000",
    paidAt: "2026-09-26",
    note: "",
    proofUrl: "",
  };

  /** Laba selalu milik satu musim; bagi hasil tanpa musim tidak bisa dicocokkan. */
  it("requires a season for a profit share", () => {
    const result = createPayoutSchema.safeParse({
      ...base,
      type: "PROFIT_SHARE",
      seasonId: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["seasonId"]);
  });

  it("accepts a profit share with its season", () => {
    const result = createPayoutSchema.safeParse({
      ...base,
      type: "PROFIT_SHARE",
      seasonId: "s1",
    });
    expect(result.success).toBe(true);
  });

  /** Tarik modal mengembalikan setoran, yang milik kas bersama. */
  it("lets a capital return stand without a season", () => {
    const result = createPayoutSchema.safeParse({
      ...base,
      type: "CAPITAL_RETURN",
      seasonId: "",
    });
    expect(result.success).toBe(true);
    expect(result.data?.amount).toBe(500_000);
  });

  it("keeps the season rule when editing", () => {
    const result = updatePayoutSchema.safeParse({
      ...base,
      payoutId: "p1",
      type: "PROFIT_SHARE",
      seasonId: "",
    });
    expect(result.success).toBe(false);
  });

  it("refuses an unknown kind and a zero amount", () => {
    expect(
      createPayoutSchema.safeParse({ ...base, type: "HADIAH", seasonId: "" })
        .success
    ).toBe(false);
    expect(
      createPayoutSchema.safeParse({
        ...base,
        amount: "0",
        type: "CAPITAL_RETURN",
        seasonId: "",
      }).success
    ).toBe(false);
  });
});

/**
 * Alat dibeli lewat Inventaris. Menerimanya juga di Keuangan membuat satu
 * cangkul bisa tercatat dua kali, dan kas berkurang dua kali.
 */
describe("expenseCategories", () => {
  it("has no tool category, because tools are bought through the shed", () => {
    expect(expenseCategories).not.toContain("Peralatan");
  });

  it("keeps seed, which goes straight into the ground", () => {
    expect(expenseCategories).toContain("Benih");
  });
});

describe("createOpeningSchema", () => {
  it("takes an amount, a date and an optional note — and no member", () => {
    const result = createOpeningSchema.safeParse({
      amount: "3000000",
      countedAt: "2026-09-26",
      note: "",
      userId: "diabaikan",
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("userId");
  });

  it("refuses nothing at all", () => {
    expect(
      createOpeningSchema.safeParse({ amount: "0", countedAt: "2026-09-26" })
        .success
    ).toBe(false);
  });
});

describe("recordPurchaseSchema", () => {
  const base = { purchasedAt: "2026-11-01", actorId: "", note: "" };
  const sack = { kind: "material", materialId: "m1", amount: 2, totalCost: 100000 };

  it("menerima bahan dan alat, lama dan baru, dalam satu belanja", () => {
    const parsed = recordPurchaseSchema.safeParse({
      ...base,
      items: [
        sack,
        {
          kind: "material",
          newMaterial: { name: "NPK 16-16-16", unit: "kg", category: "FERTILIZER", minStock: 0 },
          amount: 5,
          totalCost: null,
        },
        { kind: "tool", toolId: "t1", quantity: 1, totalCost: 75000 },
        { kind: "tool", newTool: { name: "Cangkul" }, quantity: 2, totalCost: null },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("menolak belanja kosong", () => {
    expect(recordPurchaseSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("menolak baris yang menyebut barang lama dan baru sekaligus, atau tidak keduanya", () => {
    const both = {
      ...sack,
      newMaterial: { name: "NPK", unit: "kg", category: "FERTILIZER", minStock: 0 },
    };
    const neither = { kind: "material", amount: 1, totalCost: null };
    expect(recordPurchaseSchema.safeParse({ ...base, items: [both] }).success).toBe(false);
    expect(recordPurchaseSchema.safeParse({ ...base, items: [neither] }).success).toBe(false);
  });

  it("menolak barang yang sama dua kali, termasuk nama baru beda huruf besar", () => {
    expect(recordPurchaseSchema.safeParse({ ...base, items: [sack, sack] }).success).toBe(false);
    const fresh = (name: string) => ({
      kind: "tool",
      newTool: { name },
      quantity: 1,
      totalCost: null,
    });
    expect(
      recordPurchaseSchema.safeParse({ ...base, items: [fresh("Cangkul"), fresh("cangkul")] })
        .success
    ).toBe(false);
  });

  it("menolak jumlah nol, alat pecahan, dan harga minus", () => {
    const bad = [
      { ...sack, amount: 0 },
      { ...sack, totalCost: -1 },
      { kind: "tool", toolId: "t1", quantity: 1.5, totalCost: null },
    ];
    for (const item of bad) {
      expect(recordPurchaseSchema.safeParse({ ...base, items: [item] }).success).toBe(false);
    }
  });
});

describe("createFinanceEntrySchema", () => {
  const base = {
    seasonId: "s1",
    amount: 50000,
    description: "Jual bibit sisa",
    date: "2026-11-01",
  };

  it("uang masuk tidak butuh kategori, dan selalu dicatat sebagai Pemasukan", () => {
    const parsed = createFinanceEntrySchema.parse({ ...base, type: "INCOME", category: "Upah" });
    expect(parsed.category).toBe(INCOME_CATEGORY);
    expect(createFinanceEntrySchema.safeParse({ ...base, type: "INCOME" }).success).toBe(true);
  });

  it("uang keluar tetap harus memilih kategori dari daftar", () => {
    expect(createFinanceEntrySchema.safeParse({ ...base, type: "EXPENSE" }).success).toBe(false);
    expect(
      createFinanceEntrySchema.safeParse({ ...base, type: "EXPENSE", category: "Peralatan" }).success
    ).toBe(false);
    expect(
      createFinanceEntrySchema.parse({ ...base, type: "EXPENSE", category: "Sewa" }).category
    ).toBe("Sewa");
  });
});

describe("previousSeasonStatus", () => {
  it("mundur satu langkah hanya dari dua tahap tengah", () => {
    expect(previousSeasonStatus("ACTIVE")).toBe("PLANNING");
    expect(previousSeasonStatus("HARVESTING")).toBe("ACTIVE");
    for (const status of ["PLANNING", "COMPLETED", "ARCHIVED"] as const) {
      expect(previousSeasonStatus(status)).toBeNull();
    }
  });
});

describe("canArchiveSeason", () => {
  it("hanya musim yang selesai atau yang batal ditanam", () => {
    expect(canArchiveSeason("COMPLETED")).toBe(true);
    expect(canArchiveSeason("PLANNING")).toBe(true);
    for (const status of ["ACTIVE", "HARVESTING", "ARCHIVED"] as const) {
      expect(canArchiveSeason(status)).toBe(false);
    }
  });
});
