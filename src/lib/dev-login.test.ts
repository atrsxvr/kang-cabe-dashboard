import { describe, expect, it } from "vitest";

import { devLogin } from "./dev-login";

const DEV_DB = "postgresql://postgres.devref123:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
const PROD_DB = "postgresql://postgres.prodref456:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";

const dev = (extra: Record<string, string | undefined>) => ({
  NODE_ENV: "development",
  DATABASE_URL: DEV_DB,
  PROD_DB_REF: "prodref456",
  ...extra,
});

describe("devLogin", () => {
  it("names a member by email, case-insensitively", () => {
    expect(devLogin(dev({ DEV_LOGIN_AS: " Admin@Kebun.id " }))).toEqual({
      email: "admin@kebun.id",
    });
  });

  it("names a role, for trying the app as someone other than Admin", () => {
    expect(devLogin(dev({ DEV_LOGIN_AS: "agronomist" }))).toEqual({
      role: "AGRONOMIST",
    });
  });

  it("is off unless asked for", () => {
    expect(devLogin(dev({}))).toBeNull();
    expect(devLogin(dev({ DEV_LOGIN_AS: "  " }))).toBeNull();
  });

  it("does not exist outside next dev — build, start, Vercel and e2e are all production", () => {
    expect(devLogin(dev({ DEV_LOGIN_AS: "ADMIN", NODE_ENV: "production" }))).toBeNull();
    expect(devLogin(dev({ DEV_LOGIN_AS: "ADMIN", NODE_ENV: "test" }))).toBeNull();
    expect(devLogin({ DEV_LOGIN_AS: "ADMIN" })).toBeNull();
  });

  it("refuses the production database even under next dev", () => {
    expect(devLogin(dev({ DEV_LOGIN_AS: "ADMIN", DATABASE_URL: PROD_DB }))).toBeNull();
  });

  it("still works where no production ref is set, or the database is not a Supabase pooler", () => {
    expect(devLogin(dev({ DEV_LOGIN_AS: "ADMIN", PROD_DB_REF: "" }))).toEqual({ role: "ADMIN" });
    expect(
      devLogin(dev({ DEV_LOGIN_AS: "ADMIN", DATABASE_URL: "postgresql://postgres:pw@localhost:5432/kebun" })),
    ).toEqual({ role: "ADMIN" });
  });

  it("ignores a role that does not exist rather than guessing", () => {
    expect(devLogin(dev({ DEV_LOGIN_AS: "ADMN" }))).toBeNull();
  });
});
