import { describe, expect, it } from "vitest";

import {
  createMaterialSchema,
  createSeasonSchema,
  createTaskSchema,
  nextSeasonStatus,
  recordTaskUsageSchema,
  stockOpnameSchema,
  updateMaterialSchema,
  updateTaskStatusSchema,
} from "@/server/actions/schemas";

const validSeason = {
  name: "Musim Tanam 2",
  variety: "Rawit Ori 212",
  plantCount: "5000",
  startDate: "2026-08-01",
  status: "PLANNING",
  notes: "",
};

describe("createSeasonSchema", () => {
  it("coerces the string values a FormData submit produces", () => {
    const parsed = createSeasonSchema.parse(validSeason);
    expect(parsed.plantCount).toBe(5000);
    expect(parsed.startDate).toBeInstanceOf(Date);
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
