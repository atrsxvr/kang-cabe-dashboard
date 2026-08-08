import { describe, expect, it } from "vitest";

import {
  createSeasonSchema,
  createTaskSchema,
  nextSeasonStatus,
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
