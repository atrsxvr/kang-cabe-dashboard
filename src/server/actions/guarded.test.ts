import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AREAS } from "@/lib/permissions";

/**
 * Setiap Server Action yang mengubah data harus memeriksa izinnya sendiri.
 *
 * Dokumen Next menegaskan Server Action diperlakukan seperti endpoint publik:
 * ia punya URL, dan bisa dipanggil tanpa pernah membuka halamannya. Tombol yang
 * disembunyikan bukan penjagaan, dan `proxy.ts` cuma memeriksa ada-tidaknya
 * cookie — di produksi ia bahkan bisa berjalan di CDN, jauh dari basis data.
 *
 * Jadi penjagaannya ada di 55 tempat, dan satu yang lupa adalah lubang yang
 * tidak bersuara: fiturnya tetap jalan, tesnya tetap hijau, dan tidak ada yang
 * tahu sampai seseorang memanggilnya langsung. Membaca berkasnya adalah
 * satu-satunya cara memeriksa keseluruhannya sekaligus — dan itu yang dilakukan
 * tes ini, karena pemeriksaan yang mengandalkan ketelitian orang akan gagal
 * persis pada aksi ke lima puluh enam yang ditulis bulan depan.
 */

const DIR = "src/server/actions";
const SKIP = new Set(["result.ts", "revalidate.ts", "schemas.ts"]);

const actionFiles = readdirSync(DIR).filter(
  (name) => name.endsWith(".ts") && !name.includes(".test.") && !SKIP.has(name)
);

/** Aksi yang mengubah data selalu mengembalikan `ActionResult`. */
const WRITE_ACTION =
  /export async function (\w+)\([^)]*\)[^{]*Promise<ActionResult>\s*\{/g;

type Found = { file: string; name: string; head: string };

function writeActions(): Found[] {
  const found: Found[] = [];

  for (const file of actionFiles) {
    const source = readFileSync(join(DIR, file), "utf8");

    for (const match of source.matchAll(WRITE_ACTION)) {
      found.push({
        file,
        name: match[1],
        // Cukup untuk memuat penjaga kalau ia baris pertama, dan tidak cukup
        // untuk memuat penjaga milik aksi berikutnya.
        head: source.slice(match.index + match[0].length, match.index + match[0].length + 220),
      });
    }
  }

  return found;
}

describe("penjaga Server Action", () => {
  it("finds the write actions at all, so a broken regex cannot pass silently", () => {
    // Kalau pola di atas berhenti cocok — misal karena gaya penulisan berubah —
    // tes di bawah akan lulus atas daftar kosong. Ini yang mencegahnya.
    expect(writeActions().length).toBeGreaterThan(40);
  });

  it("guards every single one", () => {
    const unguarded = writeActions()
      .filter((action) => !action.head.includes("guardWrite("))
      .map((action) => `${action.file}:${action.name}`);

    expect(unguarded, "aksi tulis tanpa guardWrite").toEqual([]);
  });

  it("guards each one with an area that actually exists", () => {
    const areas = new Set<string>(AREAS);
    const wrong: string[] = [];

    for (const action of writeActions()) {
      const area = action.head.match(/guardWrite\("(\w+)"\)/)?.[1];
      if (area && !areas.has(area)) wrong.push(`${action.file}:${action.name} → ${area}`);
    }

    expect(wrong, "wilayah yang tidak dikenal").toEqual([]);
  });

  /**
   * Penjaganya harus berjalan **sebelum** apa pun yang lain. Ditaruh sesudah
   * parsing atau sesudah satu query, penolakannya masih benar tapi aksinya sudah
   * menyentuh basis data atas nama orang yang tidak berhak.
   */
  it("puts the guard before anything else runs", () => {
    const late = writeActions()
      .filter((action) => {
        const guard = action.head.indexOf("guardWrite(");
        const prisma = action.head.indexOf("prisma.");
        const parse = action.head.indexOf("safeParse");
        const earlier = [prisma, parse].filter((at) => at !== -1);
        return earlier.some((at) => at < guard);
      })
      .map((action) => `${action.file}:${action.name}`);

    expect(late, "penjaga kesiangan").toEqual([]);
  });
});
