import { describe, expect, it } from "vitest";

import { isAuthConfigured, parseEnv } from "@/lib/env";

/**
 * Otentikasi wajib, jadi ia ikut di tiap kasus yang seharusnya lulus.
 *
 * Bukan pengulangan yang bisa dihindari: fitur yang bisa dimatikan sebagian itu
 * wajar, otentikasi yang bisa dimatikan sebagian bukan — dan aplikasi yang
 * berjalan tanpa ini adalah aplikasi yang seluruh endpoint tulisnya terbuka.
 */
const auth = {
  GOOGLE_CLIENT_ID: "1234567890-abcdef.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "GOCSPX-contoh-rahasia",
  BETTER_AUTH_SECRET: "a".repeat(32),
};

const valid = {
  DATABASE_URL: "postgresql://user:pass@host:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://user:pass@host:5432/postgres",
  ...auth,
};

describe("parseEnv", () => {
  it("accepts a Supabase pooler pair", () => {
    // https ikut disebut: sejak flag Secure pada cookie sesi bergantung padanya,
    // produksi tanpa https ditolak — lihat blok di bawah.
    const env = parseEnv({
      ...valid,
      NODE_ENV: "production",
      BETTER_AUTH_URL: "https://kebun.example.com",
    });
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.NODE_ENV).toBe("production");
  });

  it("treats DIRECT_URL as optional", () => {
    expect(() =>
      parseEnv({ DATABASE_URL: valid.DATABASE_URL, ...auth })
    ).not.toThrow();
  });

  it("defaults NODE_ENV to development", () => {
    expect(
      parseEnv({ DATABASE_URL: valid.DATABASE_URL, ...auth }).NODE_ENV
    ).toBe("development");
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

/**
 * Kalau ketiganya boleh kosong, aplikasinya akan menyala dengan seluruh
 * endpoint tulisnya terbuka — dan tidak ada yang menandainya. Wajibkan.
 */
describe("otentikasi wajib di produksi", () => {
  for (const key of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "BETTER_AUTH_SECRET",
  ] as const) {
    it(`refuses to boot in production without ${key}`, () => {
      const without = { ...valid, NODE_ENV: "production" };
      delete without[key];

      expect(() => parseEnv(without)).toThrow(new RegExp(key));
    });

    /**
     * Tapi localhost tetap menyala. Gagal keras di situ tidak melindungi siapa
     * pun, dan menukar halaman yang bisa dibaca dengan tumpukan galat membuat
     * orang yang sedang memasang kredensialnya kehilangan tempat berpijak.
     */
    it(`still boots on localhost without ${key}`, () => {
      const without = { ...valid };
      delete without[key];

      expect(() => parseEnv(without)).not.toThrow();
      expect(isAuthConfigured(parseEnv(without))).toBe(false);
    });
  }

  /**
   * Flag `Secure` pada cookie sesi ditentukan better-auth dari apakah baseURL
   * dimulai `https://`. Diisi `http://` di produksi, cookie dikirim polos tanpa
   * satu pun galat atau peringatan — aplikasinya jalan normal, dan siapa pun di
   * jaringan yang sama bisa membaca lalu memakai sesinya.
   */
  it("refuses a plain http origin on a real host", () => {
    expect(() =>
      parseEnv({ ...valid, BETTER_AUTH_URL: "http://kebun.example.com" })
    ).toThrow(/BETTER_AUTH_URL/);
  });

  /**
   * Diperiksa dari host-nya, bukan dari NODE_ENV. Versi pertama memakai
   * `NODE_ENV === "production"` — dan `next build` menyetelnya pada setiap
   * build, jadi penjaganya menolak boot pada perintah yang paling sering
   * dijalankan. Build lokal dan CI sama-sama mati sebelum ketahuan.
   */
  it("does not depend on NODE_ENV, which every build sets", () => {
    expect(() =>
      parseEnv({
        ...valid,
        NODE_ENV: "production",
        BETTER_AUTH_URL: "http://localhost:3000",
      })
    ).not.toThrow();
  });

  it("accepts https in production", () => {
    expect(() =>
      parseEnv({
        ...valid,
        NODE_ENV: "production",
        BETTER_AUTH_URL: "https://kebun.example.com",
      })
    ).not.toThrow();
  });

  /** Tapi localhost tetap boleh http — di situ tidak ada yang menyadap. */
  it("still allows http on localhost", () => {
    expect(() =>
      parseEnv({ ...valid, BETTER_AUTH_URL: "http://localhost:3000" })
    ).not.toThrow();
  });

  it("rejects a session secret too short to be worth signing with", () => {
    expect(() =>
      parseEnv({ ...valid, BETTER_AUTH_SECRET: "terlalu-pendek" })
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("calls a complete set configured", () => {
    expect(isAuthConfigured(parseEnv(valid))).toBe(true);
  });
});
