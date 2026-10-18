/**
 * CSV that opens straight in Excel set to Indonesian.
 *
 * Three choices, all for that one target:
 *
 * - **Semicolons, not commas.** Excel takes its list separator from the
 *   regional setting, and in Indonesian that is ";" — because the comma is
 *   the decimal mark. A comma-separated file opens as one column per row.
 * - **Decimal comma.** "12,5" kg, for the same reason. Rupiah are whole
 *   numbers and carry no separator at all, so Excel reads them as numbers
 *   that can be summed rather than as text.
 * - **A UTF-8 byte order mark.** Without it Excel guesses the old Windows
 *   code page and a buyer called "Bu Dédé" arrives mangled.
 */

export type CsvCell = string | number | Date | null | undefined;

const SEPARATOR = ";";
const BOM = "﻿";

/** YYYY-MM-DD on the garden's calendar — sorts correctly and Excel reads it. */
export function csvDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return csvDate(value);
  if (typeof value === "number") {
    // Rounded to what any figure here actually carries: kilos to the gram,
    // rupiah to the rupiah. A float tail like 0,30000000000000004 would
    // otherwise land in the sheet.
    const rounded = Math.round(value * 1000) / 1000;
    return String(rounded).replace(".", ",");
  }

  let text = value;
  // A buyer name typed as "=HYPERLINK(...)" must stay a name. Excel runs a
  // cell that starts with any of these as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(cell).join(SEPARATOR));
  // CRLF: what Excel writes, and what it reads without a blank line between
  // every row on some versions.
  return BOM + lines.join("\r\n") + "\r\n";
}

/** "Musim Tanam 1" → "musim-tanam-1", for a filename that survives any OS. */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "data"
  );
}
