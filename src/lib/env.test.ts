import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@host:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://user:pass@host:5432/postgres",
};

describe("parseEnv", () => {
  it("accepts a Supabase pooler pair", () => {
    const env = parseEnv({ ...valid, NODE_ENV: "production" });
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.NODE_ENV).toBe("production");
  });

  it("treats DIRECT_URL as optional", () => {
    expect(() => parseEnv({ DATABASE_URL: valid.DATABASE_URL })).not.toThrow();
  });

  it("defaults NODE_ENV to development", () => {
    expect(parseEnv({ DATABASE_URL: valid.DATABASE_URL }).NODE_ENV).toBe(
      "development"
    );
  });

  it("rejects a missing DATABASE_URL and names it", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects the Supabase REST URL, which is not a connection string", () => {
    expect(() =>
      parseEnv({ DATABASE_URL: "https://abcdef.supabase.co" })
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects a password left wrapped in the docs placeholder brackets", () => {
    // Square brackets are not legal in the userinfo component of a URL.
    expect(() =>
      parseEnv({ DATABASE_URL: "postgresql://user:[secret]@host:5432/postgres" })
    ).toThrow(/DATABASE_URL/);
  });
});
