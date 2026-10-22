import { describe, expect, it } from "vitest";

import {
  newFindingMessage,
  scheduledSoon,
  scheduledTaskMessage,
  tomorrowTasksMessage,
  tomorrowWindow,
} from "@/lib/notifications";

describe("tomorrowWindow", () => {
  // 18.30 WIB on 21 October — when the scheduled run lands.
  const evening = new Date("2026-10-21T11:30:00Z");

  it("is the next calendar day in Jakarta", () => {
    expect(tomorrowWindow(evening)).toEqual({
      from: new Date("2026-10-21T17:00:00Z"), // 22 Oct 00.00 WIB
      to: new Date("2026-10-22T17:00:00Z"), // 23 Oct 00.00 WIB
    });
  });

  it("takes in a due date stored as that day's UTC midnight", () => {
    const { from, to } = tomorrowWindow(evening);
    const due = (day: string) => new Date(`${day}T00:00:00Z`);
    const inside = (date: Date) => date >= from && date < to;

    expect(inside(due("2026-10-22"))).toBe(true);
    expect(inside(due("2026-10-21"))).toBe(false);
    expect(inside(due("2026-10-23"))).toBe(false);
  });

  it("still means the next day at 18.59 WIB, the latest the run may land", () => {
    expect(tomorrowWindow(new Date("2026-10-21T11:59:00Z")).from).toEqual(
      new Date("2026-10-21T17:00:00Z")
    );
  });
});

describe("tomorrowTasksMessage", () => {
  const task = (title: string, season = "Musim Tanam 1") => ({ title, season });

  it("says nothing when there is nothing tomorrow", () => {
    expect(tomorrowTasksMessage([])).toBeNull();
  });

  it("names up to three tasks and the season", () => {
    expect(
      tomorrowTasksMessage([task("Semprot fungisida"), task("Kocor NPK")])
    ).toEqual({
      title: "Besok ada 2 tugas",
      body: "Semprot fungisida, Kocor NPK — Musim Tanam 1",
      url: "/tasks",
      tag: "tugas-besok",
    });
  });

  it("counts the rest instead of listing them", () => {
    const message = tomorrowTasksMessage(
      ["A", "B", "C", "D", "E"].map((title) => task(title))
    );
    expect(message?.title).toBe("Besok ada 5 tugas");
    expect(message?.body).toBe("A, B, C dan 2 lainnya — Musim Tanam 1");
  });

  it("leaves the season out when tomorrow spans several", () => {
    expect(
      tomorrowTasksMessage([task("A", "Musim 1"), task("B", "Musim 2")])?.body
    ).toBe("A, B");
  });
});

describe("newFindingMessage", () => {
  const finding = {
    id: "f1",
    seasonId: "s 1",
    reporter: "Gotay",
    symptoms: "Daun   keriting\\ndi petak 3",
    severity: "Sedang",
  };

  it("says who found what, how bad, and opens the season's findings", () => {
    expect(newFindingMessage({ ...finding, symptoms: "Daun keriting", location: "Petak 3" })).toEqual({
      title: "Temuan baru dari Gotay",
      body: "Daun keriting · Sedang · Petak 3",
      url: "/health?season=s%201",
      tag: "temuan-f1",
    });
  });

  it("flattens whitespace and shortens a long description", () => {
    const long = newFindingMessage({ ...finding, symptoms: "x".repeat(150) });
    expect(long.body.startsWith("x".repeat(99) + "…")).toBe(true);
    expect(newFindingMessage({ ...finding, symptoms: "Daun   keriting\n di petak 3" }).body).toBe(
      "Daun keriting di petak 3 · Sedang"
    );
  });
});

describe("scheduledSoon", () => {
  // Due dates are stored as that day's UTC midnight.
  const due = (day: string) => new Date(`${day}T00:00:00Z`);

  it("announces a task for today at any hour", () => {
    // 08.00 WIB on 22 October.
    expect(scheduledSoon(due("2026-10-22"), new Date("2026-10-22T01:00:00Z"))).toBe("today");
  });

  it("leaves a task for tomorrow to the evening summary before 18.00 WIB", () => {
    // Thursday 15.00 WIB, task for Friday.
    expect(scheduledSoon(due("2026-10-23"), new Date("2026-10-22T08:00:00Z"))).toBeNull();
  });

  it("announces a task for tomorrow once the evening run has come", () => {
    // Thursday 20.00 WIB, task for Friday — the summary has already gone.
    expect(scheduledSoon(due("2026-10-23"), new Date("2026-10-22T13:00:00Z"))).toBe(
      "tomorrow"
    );
  });

  it("reads the hour in Jakarta", () => {
    // 17.30 UTC is 00.30 WIB the next day, so "tomorrow" has moved on too.
    expect(scheduledSoon(due("2026-10-23"), new Date("2026-10-22T17:30:00Z"))).toBe("today");
  });

  it("ignores anything further out", () => {
    expect(scheduledSoon(due("2026-10-25"), new Date("2026-10-22T13:00:00Z"))).toBeNull();
    expect(scheduledSoon(due("2026-10-20"), new Date("2026-10-22T13:00:00Z"))).toBeNull();
  });
});

describe("scheduledTaskMessage", () => {
  it("says which day and names the task and season", () => {
    expect(
      scheduledTaskMessage({ id: "t1", title: "Semprot fungisida", season: "Musim 2", when: "tomorrow" })
    ).toEqual({
      title: "Tugas baru untuk besok",
      body: "Semprot fungisida — Musim 2",
      url: "/tasks",
      tag: "tugas-t1",
    });
  });
});
