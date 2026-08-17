import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-path";

describe("safeNextPath", () => {
  it("lets a real page through, query string and all", () => {
    expect(safeNextPath("/finance")).toBe("/finance");
    expect(safeNextPath("/finance?season=abc")).toBe("/finance?season=abc");
    expect(safeNextPath("/health/populasi")).toBe("/health/populasi");
  });

  /**
   * Ketiga bentuk ini terbukti lolos dari pemeriksaan `startsWith("/")` dan
   * benar-benar mengalihkan ke luar aplikasi — diuji terhadap server sungguhan
   * sebelum dibetulkan.
   */
  it("refuses an absolute URL", () => {
    expect(safeNextPath("https://contoh-jahat.com/")).toBe("/");
    expect(safeNextPath("http://contoh-jahat.com/")).toBe("/");
  });

  it("refuses a protocol-relative URL", () => {
    expect(safeNextPath("//contoh-jahat.com/")).toBe("/");
  });

  /** Peramban dan pengurai WHATWG membaca `\` sebagai `/`. */
  it("refuses the backslash trick", () => {
    expect(safeNextPath("/\\contoh-jahat.com")).toBe("/");
    expect(safeNextPath("/\\/contoh-jahat.com")).toBe("/");
  });

  it("refuses anything that is not a plain string path", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(["/finance"])).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("finance")).toBe("/");
  });

  /**
   * Bentuk terkode tetap jadi jalur di host kita sendiri — dan itu memang aman.
   *
   * `%2F` tidak diuraikan menjadi pemisah jalur, jadi hasilnya diminta dari
   * domain aplikasi ini, bukan domain lain. Yang diperiksa karena itu bukan
   * "tidak memuat nama host jahat" — teks itu boleh lewat sebagai nama jalur —
   * melainkan **origin-nya tidak bergeser**, yang satu-satunya sifat yang
   * menentukan aman atau tidak.
   */
  it("keeps encoded attempts on our own host", () => {
    for (const input of [
      "/%2F%2Fcontoh-jahat.com",
      "/%5Ccontoh-jahat.com",
      "/finance/%2E%2E/%2E%2E",
    ]) {
      const out = safeNextPath(input);
      expect(out.startsWith("/"), input).toBe(true);
      expect(out.startsWith("//"), input).toBe(false);
      expect(new URL(out, "http://localhost").origin).toBe("http://localhost");
    }
  });

  it("drops any fragment, which the server never needs", () => {
    expect(safeNextPath("/finance#bagian")).toBe("/finance");
  });

  it("can fall back somewhere other than the dashboard", () => {
    expect(safeNextPath("https://contoh-jahat.com", "/masuk")).toBe("/masuk");
  });
});
