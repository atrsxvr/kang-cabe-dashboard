import { beforeEach, describe, expect, it, vi } from "vitest";

// `connection()` needs a request scope that Vitest has no way to provide.
vi.mock("next/server", () => ({ connection: async () => undefined }));

const listSeasons = vi.fn();
vi.mock("@/server/queries/seasons", () => ({ listSeasons }));

const { SeasonSelectorLoader } = await import(
  "@/components/seasons/season-selector-loader"
);

describe("SeasonSelectorLoader", () => {
  beforeEach(() => {
    listSeasons.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the selector when the query succeeds", async () => {
    listSeasons.mockResolvedValue([
      { id: "s1", name: "Musim Tanam 1", status: "ACTIVE" },
    ]);

    const element = await SeasonSelectorLoader();

    expect(element.props.seasons).toHaveLength(1);
  });

  /**
   * The regression this guards: this component renders inside the dashboard
   * layout, and a layout's throw bypasses error.tsx and lands on global-error,
   * blanking the entire shell. A dropped database connection must degrade this
   * one control, never take down navigation with it.
   */
  it("does not throw when the database is unreachable", async () => {
    listSeasons.mockRejectedValue(new Error("connection refused"));

    await expect(SeasonSelectorLoader()).resolves.toBeDefined();
  });

  it("falls back to a different element than the selector on failure", async () => {
    listSeasons.mockResolvedValue([]);
    const ok = await SeasonSelectorLoader();

    listSeasons.mockRejectedValue(new Error("connection refused"));
    const degraded = await SeasonSelectorLoader();

    expect(degraded.type).not.toBe(ok.type);
  });

  it("logs the failure so it is diagnosable in server logs", async () => {
    const error = new Error("connection refused");
    listSeasons.mockRejectedValue(error);

    await SeasonSelectorLoader();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("musim"),
      error
    );
  });
});
