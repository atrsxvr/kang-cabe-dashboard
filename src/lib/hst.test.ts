import { describe, expect, it } from "vitest";

import { calculateHst, daysUntil, weekendRange } from "@/lib/hst";

/** Renders an instant as its Jakarta wall-clock date, for readable assertions. */
const inJakarta = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

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

describe("weekendRange", () => {
  // 2026-08-08 is a Saturday; the week runs Mon 3 Aug – Sun 9 Aug.
  const expectWeekendOf3Aug = (now: Date) => {
    const { saturday, sunday, start, end } = weekendRange(now);
    expect(inJakarta(saturday)).toBe("2026-08-08, 00:00");
    expect(inJakarta(sunday)).toBe("2026-08-09, 00:00");
    expect(inJakarta(start)).toBe("2026-08-08, 00:00");
    // Half-open: the range ends at Monday midnight, so all of Sunday counts.
    expect(inJakarta(end)).toBe("2026-08-10, 00:00");
  };

  it("finds the coming weekend from a Monday", () => {
    expectWeekendOf3Aug(new Date("2026-08-03T05:00:00Z"));
  });

  it("finds the coming weekend from a Wednesday", () => {
    expectWeekendOf3Aug(new Date("2026-08-05T05:00:00Z"));
  });

  it("uses today when today is Saturday", () => {
    expectWeekendOf3Aug(new Date("2026-08-08T05:00:00Z"));
  });

  /**
   * On a Sunday, "this weekend" is the one in progress — yesterday and today —
   * not next week's. A naive "next Saturday" would skip the current one.
   */
  it("keeps the weekend in progress when today is Sunday", () => {
    expectWeekendOf3Aug(new Date("2026-08-09T05:00:00Z"));
  });

  it("moves to the next weekend once Monday arrives", () => {
    const { saturday } = weekendRange(new Date("2026-08-10T05:00:00Z"));
    expect(inJakarta(saturday)).toBe("2026-08-15, 00:00");
  });

  /** Late-evening UTC is already the next day in Jakarta. */
  it("uses the Jakarta day, not the UTC day, to pick the week", () => {
    // 2026-08-09T18:00Z is Monday 01:00 WIB, so the weekend has moved on.
    const { saturday } = weekendRange(new Date("2026-08-09T18:00:00Z"));
    expect(inJakarta(saturday)).toBe("2026-08-15, 00:00");
  });

  it("spans exactly two days", () => {
    const { start, end } = weekendRange(new Date("2026-08-05T05:00:00Z"));
    expect(end.getTime() - start.getTime()).toBe(2 * 86_400_000);
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
