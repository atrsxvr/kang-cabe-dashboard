import { describe, expect, it } from "vitest";

import { nextServiceDate, serviceStatus } from "@/lib/tools";

const today = new Date("2026-08-15T03:00:00Z");

describe("serviceStatus", () => {
  it("says nothing for a tool with no schedule", () => {
    expect(serviceStatus(new Date("2020-01-01"), null, today)).toBe("NONE");
  });

  /**
   * The interval is the statement that this tool needs looking after; nothing
   * on record says it ever was, so it is overdue rather than fine.
   */
  it("treats a scheduled tool that was never serviced as overdue", () => {
    expect(serviceStatus(null, 90, today)).toBe("OVERDUE");
  });

  it("is fine well before the interval runs out", () => {
    expect(serviceStatus(new Date("2026-08-01T00:00:00Z"), 90, today)).toBe(
      "OK"
    );
  });

  it("gives a fortnight's notice", () => {
    expect(serviceStatus(new Date("2026-05-25T00:00:00Z"), 90, today)).toBe(
      "DUE_SOON"
    );
  });

  it("flags one that is past due", () => {
    expect(serviceStatus(new Date("2026-01-01T00:00:00Z"), 90, today)).toBe(
      "OVERDUE"
    );
  });

  it("ignores a zero interval instead of dividing the year into nothing", () => {
    expect(serviceStatus(new Date("2026-01-01T00:00:00Z"), 0, today)).toBe(
      "NONE"
    );
  });
});

describe("nextServiceDate", () => {
  it("counts forward from the last service", () => {
    const due = nextServiceDate(new Date("2026-08-01T00:00:00Z"), 90);
    expect(due?.toISOString().slice(0, 10)).toBe("2026-10-30");
  });

  it("has no answer for a tool never serviced", () => {
    expect(nextServiceDate(null, 90)).toBeNull();
  });
});
