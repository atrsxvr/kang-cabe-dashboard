import { describe, expect, it } from "vitest";

import { csvDate, slugify, toCsv } from "@/lib/csv";

const body = (csv: string) => csv.replace(/^﻿/, "");

describe("toCsv", () => {
  it("starts with a byte order mark so Excel reads it as UTF-8", () => {
    expect(toCsv(["a"], []).startsWith("﻿")).toBe(true);
  });

  it("separates with semicolons and ends lines with CRLF", () => {
    expect(body(toCsv(["Nama", "Kg"], [["Bagus", 12]]))).toBe(
      "Nama;Kg\r\nBagus;12\r\n"
    );
  });

  it("writes decimals with a comma, and rupiah without separators", () => {
    expect(body(toCsv(["kg", "rp"], [[12.5, 1500000]]))).toBe(
      "kg;rp\r\n12,5;1500000\r\n"
    );
  });

  it("drops a floating-point tail", () => {
    expect(body(toCsv(["kg"], [[0.1 + 0.2]]))).toBe("kg\r\n0,3\r\n");
  });

  it("quotes a cell holding the separator, a quote, or a line break", () => {
    expect(body(toCsv(["x"], [["a;b"], ['kata "itu"'], ["dua\nbaris"]]))).toBe(
      'x\r\n"a;b"\r\n"kata ""itu"""\r\n"dua\nbaris"\r\n'
    );
  });

  it("leaves empty cells empty", () => {
    expect(body(toCsv(["a", "b"], [[null, undefined]]))).toBe("a;b\r\n;\r\n");
  });

  it("defuses text Excel would run as a formula", () => {
    expect(body(toCsv(["pembeli"], [["=1+1"], ["@SUM(A1)"]]))).toBe(
      "pembeli\r\n'=1+1\r\n'@SUM(A1)\r\n"
    );
  });

  it("keeps a negative number a number", () => {
    expect(body(toCsv(["delta"], [[-250]]))).toBe("delta\r\n-250\r\n");
  });
});

describe("csvDate", () => {
  it("uses the garden's calendar, not UTC", () => {
    // 20:00 UTC on the 1st is already the 2nd in Jakarta.
    expect(csvDate(new Date("2026-07-01T20:00:00Z"))).toBe("2026-07-02");
  });
});

describe("slugify", () => {
  it("makes a filename-safe slug", () => {
    expect(slugify("Musim Tanam 1")).toBe("musim-tanam-1");
    expect(slugify("Kemarau '26 — Rawit")).toBe("kemarau-26-rawit");
    expect(slugify("!!!")).toBe("data");
  });
});
