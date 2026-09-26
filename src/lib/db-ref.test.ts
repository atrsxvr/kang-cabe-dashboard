import { describe, expect, it } from "vitest";

import { projectRefOf } from "@/lib/db-ref";

describe("projectRefOf", () => {
  it("reads the ref out of a Supabase pooler URL", () => {
    expect(
      projectRefOf(
        "postgresql://postgres.abcdefghijklmnop:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
      )
    ).toBe("abcdefghijklmnop");
  });

  /** Sesi (5432) dan transaksi (6543) membawa ref yang sama. */
  it("gives the same ref for both pooler ports", () => {
    const session = projectRefOf(
      "postgresql://postgres.xyz123:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
    );
    const transaction = projectRefOf(
      "postgresql://postgres.xyz123:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    );
    expect(session).toBe("xyz123");
    expect(transaction).toBe(session);
  });

  /**
   * Basis data yang bukan Supabase tidak punya ref, dan penjaganya memang harus
   * diam di situ — Postgres lokal dan kontainer sekali pakai di CI tidak ada
   * yang perlu dilindungi.
   */
  it("has no ref for a plain Postgres URL", () => {
    expect(projectRefOf("postgresql://postgres:pw@localhost:5432/kang_cabe")).toBeNull();
    expect(projectRefOf("postgresql://ci:ci@localhost:5432/ci")).toBeNull();
  });

  it("has no ref for nothing at all", () => {
    expect(projectRefOf(undefined)).toBeNull();
    expect(projectRefOf("")).toBeNull();
  });

  /** `postgres.` tanpa apa-apa sesudahnya bukan ref, dan tidak boleh cocok
   *  dengan PROD_DB_REF yang juga kosong. */
  it("has no ref for a bare postgres. prefix", () => {
    expect(
      projectRefOf("postgresql://postgres.:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres")
    ).toBeNull();
  });
});
