import { describe, expect, it } from "vitest";

import { calculateHst, daysUntil } from "@/lib/hst";

describe("calculateHst", () => {
  it("counts the planting date itself as HST 0", () => {
    const start = new Date("2026-08-08T03:00:00Z");
    expect(calculateHst(start, start)).toBe(0);
  });

  it("counts whole days since planting", () => {
    const start = new Date("2026-06-24T00:00:00Z");
    const now = new Date("2026-08-08T00:00:00Z");
    expect(calculateHst(start, now)).toBe(45);
  });

  /**
   * The server runs in UTC, where a new day begins at 07:00 WIB. Counting in
   * UTC would show a farmer opening the dashboard at 6am the previous day's
   * HST — the bug this timezone handling exists to prevent.
   */
  it("rolls over at midnight Jakarta, not midnight UTC", () => {
    const start = new Date("2026-08-01T00:00:00Z");

    // 23:30 WIB on 8 Aug = 16:30 UTC. Still 8 Aug in Jakarta.
    expect(calculateHst(start, new Date("2026-08-08T16:30:00Z"))).toBe(7);

    // 00:30 WIB on 9 Aug = 17:30 UTC on 8 Aug. Already 9 Aug in Jakarta.
    expect(calculateHst(start, new Date("2026-08-08T17:30:00Z"))).toBe(8);
  });

  it("survives a daylight-saving-free but cross-month span", () => {
    expect(
      calculateHst(new Date("2026-01-31T05:00:00Z"), new Date("2026-03-01T05:00:00Z"))
    ).toBe(29);
  });

  it("clamps a season that has not been planted yet to 0", () => {
    const start = new Date("2026-12-01T00:00:00Z");
    const now = new Date("2026-08-08T00:00:00Z");
    expect(calculateHst(start, now)).toBe(0);
  });
});

describe("daysUntil", () => {
  it("returns 0 on the due date", () => {
    // Both instants fall on 8 Aug in Jakarta: 17:00 and 08:00 WIB.
    expect(
      daysUntil(new Date("2026-08-08T10:00:00Z"), new Date("2026-08-08T01:00:00Z"))
    ).toBe(0);
  });

  it("reads a late-evening UTC instant as the next Jakarta day", () => {
    // 20:00Z is already 03:00 WIB on 9 Aug — a due date set that way is
    // tomorrow's, not today's.
    expect(
      daysUntil(new Date("2026-08-08T20:00:00Z"), new Date("2026-08-08T01:00:00Z"))
    ).toBe(1);
  });

  it("returns a negative number once overdue", () => {
    expect(
      daysUntil(new Date("2026-08-05T00:00:00Z"), new Date("2026-08-08T00:00:00Z"))
    ).toBe(-3);
  });

  it("returns a positive number while still upcoming", () => {
    expect(
      daysUntil(new Date("2026-08-11T00:00:00Z"), new Date("2026-08-08T00:00:00Z"))
    ).toBe(3);
  });
});
