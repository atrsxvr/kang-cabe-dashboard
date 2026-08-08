import { describe, expect, it } from "vitest";

import {
  canAdvanceFinding,
  createFindingSchema,
  diagnoseFindingSchema,
} from "@/server/actions/schemas";
import { deriveSupabaseUrl } from "@/lib/env";

const validFinding = {
  seasonId: "season-1",
  hst: "45",
  symptoms: "Daun menguning dari bawah, ada bercak coklat",
  severity: "MEDIUM",
  location: "",
  reportedById: "",
  photoUrl: "",
};

describe("createFindingSchema", () => {
  it("accepts a finding with no photo and no reporter", () => {
    const parsed = createFindingSchema.parse(validFinding);
    expect(parsed.hst).toBe(45);
    expect(parsed.photoUrl).toBe("");
  });

  it("rejects symptoms too short to act on", () => {
    expect(
      createFindingSchema.safeParse({ ...validFinding, symptoms: "kuning" })
        .success
    ).toBe(false);
  });

  it("rejects an unknown severity", () => {
    expect(
      createFindingSchema.safeParse({ ...validFinding, severity: "PARAH" })
        .success
    ).toBe(false);
  });

  /** seasonId keeps the finding inside its crop; it can never be blank. */
  it("rejects a missing seasonId", () => {
    expect(
      createFindingSchema.safeParse({ ...validFinding, seasonId: "" }).success
    ).toBe(false);
  });

  it("rejects a photoUrl that is not a URL", () => {
    expect(
      createFindingSchema.safeParse({ ...validFinding, photoUrl: "foto.jpg" })
        .success
    ).toBe(false);
  });
});

describe("diagnoseFindingSchema", () => {
  it("requires a seasonId so the update cannot reach another season", () => {
    expect(
      diagnoseFindingSchema.safeParse({
        findingId: "f1",
        diagnosis: "Antraknosa",
        treatment: "Semprot fungisida",
      }).success
    ).toBe(false);
  });

  it("requires both a diagnosis and a treatment", () => {
    expect(
      diagnoseFindingSchema.safeParse({
        findingId: "f1",
        seasonId: "s1",
        diagnosis: "Antraknosa",
        treatment: "",
      }).success
    ).toBe(false);
  });
});

describe("canAdvanceFinding", () => {
  /**
   * The workflow's whole point: nobody marks a finding treated before the
   * agronomist has said what the treatment is.
   */
  it("blocks jumping straight from reported to treated", () => {
    expect(canAdvanceFinding("REPORTED", "TREATED")).toBe(false);
    expect(canAdvanceFinding("REPORTED", "RESOLVED")).toBe(false);
  });

  it("allows a reported finding to be diagnosed", () => {
    expect(canAdvanceFinding("REPORTED", "DIAGNOSED")).toBe(true);
  });

  it("allows moving forward once diagnosed", () => {
    expect(canAdvanceFinding("DIAGNOSED", "TREATED")).toBe(true);
    expect(canAdvanceFinding("TREATED", "RESOLVED")).toBe(true);
  });

  it("refuses to move backwards", () => {
    expect(canAdvanceFinding("RESOLVED", "TREATED")).toBe(false);
    expect(canAdvanceFinding("TREATED", "DIAGNOSED")).toBe(false);
  });

  it("treats a no-op as not advancing", () => {
    expect(canAdvanceFinding("DIAGNOSED", "DIAGNOSED")).toBe(false);
  });
});

describe("deriveSupabaseUrl", () => {
  it("reads the project ref out of a Supabase pooler URL", () => {
    expect(
      deriveSupabaseUrl(
        "postgresql://postgres.abcdef123:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
      )
    ).toBe("https://abcdef123.supabase.co");
  });

  it("returns undefined for a non-Supabase connection string", () => {
    expect(
      deriveSupabaseUrl("postgresql://postgres:pw@localhost:5432/kang_cabe")
    ).toBeUndefined();
  });
});
