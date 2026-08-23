import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { id: string; name: string; status: string; startDate: string };

let rows: Row[] = [];

/**
 * Stands in for `findFirst` with only the shapes `getDefaultSeason` actually
 * passes: an exact status, `not`, or no filter at all. Anything else throws
 * rather than quietly matching everything, so a future clause added to the
 * order list cannot pass these tests by accident.
 */
const findFirst = vi.fn(
  async ({ where }: { where: Record<string, unknown> }) => {
    const matches = rows.filter((row) => {
      const status = where.status;
      if (status === undefined) return true;
      if (typeof status === "string") return row.status === status;
      if (status && typeof status === "object" && "not" in status) {
        return row.status !== (status as { not: string }).not;
      }
      throw new Error(`filter status tak dikenal: ${JSON.stringify(status)}`);
    });

    return (
      [...matches].sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ??
      null
    );
  }
);

vi.mock("@/lib/prisma", () => ({ prisma: { season: { findFirst } } }));

const { getDefaultSeason } = await import("@/server/queries/seasons");

describe("getDefaultSeason", () => {
  beforeEach(() => {
    findFirst.mockClear();
    rows = [];
  });

  it("picks the running season over an older one", async () => {
    rows = [
      { id: "a", name: "Musim 1", status: "COMPLETED", startDate: "2026-01-11" },
      { id: "b", name: "Musim 2", status: "ACTIVE", startDate: "2026-03-01" },
    ];

    await expect(getDefaultSeason()).resolves.toMatchObject({ id: "b" });
  });

  it("picks the newest when several are running", async () => {
    rows = [
      { id: "a", name: "Musim 1", status: "ACTIVE", startDate: "2026-01-11" },
      { id: "b", name: "Musim 2", status: "ACTIVE", startDate: "2026-03-01" },
    ];

    await expect(getDefaultSeason()).resolves.toMatchObject({ id: "b" });
  });

  it("falls back to the one being picked when none is active", async () => {
    rows = [
      { id: "a", name: "Musim 1", status: "HARVESTING", startDate: "2026-01-11" },
      { id: "b", name: "Musim 2", status: "PLANNING", startDate: "2026-03-01" },
    ];

    await expect(getDefaultSeason()).resolves.toMatchObject({ id: "a" });
  });

  /**
   * The regression this exists for. Ordering by start date alone handed the
   * default to whichever season was newest, archived or not — so archiving a
   * planting made every page in the app open on it, blank, with the season
   * still being harvested one click away and no sign anything was wrong.
   */
  it("never defaults to an archived season while another exists", async () => {
    rows = [
      {
        id: "a",
        name: "Musim 1",
        status: "HARVESTING",
        startDate: "2026-01-11",
      },
      { id: "b", name: "Musim 2", status: "ARCHIVED", startDate: "2026-08-10" },
    ];

    await expect(getDefaultSeason()).resolves.toMatchObject({ id: "a" });
  });

  /**
   * But archived is still better than nothing: a garden that has put all its
   * seasons away has a history to show, and answering "belum ada musim tanam"
   * would be a plain lie about data sitting right there.
   */
  it("shows an archived season when it is the only one", async () => {
    rows = [
      { id: "b", name: "Musim 2", status: "ARCHIVED", startDate: "2026-08-10" },
    ];

    await expect(getDefaultSeason()).resolves.toMatchObject({ id: "b" });
  });

  it("returns null when there are no seasons at all", async () => {
    await expect(getDefaultSeason()).resolves.toBeNull();
  });

  it("stops querying as soon as it finds one", async () => {
    rows = [
      { id: "b", name: "Musim 2", status: "ACTIVE", startDate: "2026-03-01" },
    ];

    await getDefaultSeason();

    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
