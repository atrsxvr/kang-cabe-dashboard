import { describe, expect, it } from "vitest";

import { classifyDbError, describeDiagnosis } from "@/lib/connection";

describe("classifyDbError", () => {
  it("reads Supabase's 'cannot wake the project' as paused, not a bad password", () => {
    // The shape seen from this project's own pooler, nested the way Prisma's
    // driver adapter nests it.
    const error = Object.assign(new Error("Database error"), {
      code: "P2039",
      meta: {
        driverAdapterError: {
          cause: {
            message:
              "(EAUTHQUERY) authentication query failed: connection to database not available",
          },
        },
      },
    });
    expect(classifyDbError(error)).toBe("paused");
  });

  it("finds the cause however deep it is nested", () => {
    const error = new Error("outer", {
      cause: new Error("middle", { cause: { code: "ECONNREFUSED" } }),
    });
    expect(classifyDbError(error)).toBe("unreachable");
  });

  it("names a wrong password", () => {
    expect(
      classifyDbError({ message: 'password authentication failed for user "postgres"' })
    ).toBe("auth");
    expect(classifyDbError({ code: "28P01" })).toBe("auth");
  });

  it("tells a full pool from a slow database", () => {
    expect(
      classifyDbError({ code: "P2024", message: "Timed out fetching a new connection" })
    ).toBe("busy");
    expect(classifyDbError({ message: "sorry, too many clients already" })).toBe(
      "busy"
    );
    expect(classifyDbError(new Error("Query timed out"))).toBe("timeout");
  });

  it("recognises an address that does not resolve", () => {
    expect(classifyDbError(new Error("getaddrinfo ENOTFOUND db.example"))).toBe(
      "unreachable"
    );
  });

  it("admits when it does not know", () => {
    expect(classifyDbError(new Error("something else"))).toBe("unknown");
    expect(classifyDbError(null)).toBe("unknown");
  });

  it("survives a circular meta", () => {
    const meta: Record<string, unknown> = {};
    meta.self = meta;
    expect(classifyDbError({ message: "ECONNRESET", meta })).toBe("unreachable");
  });
});

describe("describeDiagnosis", () => {
  it("says where the problem is for every outcome", () => {
    for (const diagnosis of [
      { where: "offline" },
      { where: "server-unreachable" },
      { where: "server-error", status: 500 },
      { where: "database", problem: "paused" },
      { where: "app" },
    ] as const) {
      const message = describeDiagnosis(diagnosis);
      expect(message.title).not.toBe("");
      expect(message.where).not.toBe("");
      expect(message.steps.length).toBeGreaterThan(0);
    }
  });

  it("puts a phone without internet on the phone, not the server", () => {
    expect(describeDiagnosis({ where: "offline" }).where).toMatch(/HP-mu/);
  });
});
