import { describe, expect, it } from "vitest";

import { programTaskTitle, uncoveredSlots } from "@/lib/program";

const base = { fromHst: 30, toHst: 42, intervalDays: 6, recipeName: "NPK" };

describe("uncoveredSlots", () => {
  it("menjadwalkan semua kalau belum ada apa-apa", () => {
    expect(uncoveredSlots({ ...base, existing: [] })).toEqual([30, 36, 42]);
  });

  it("tugas yang ditunda tidak membuat jadwal kembar", () => {
    // HST 30 ditunda dua hari ke HST 32, judulnya tetap.
    const existing = [{ hst: 32, title: programTaskTitle("NPK", 30) }];
    expect(uncoveredSlots({ ...base, existing })).toEqual([36, 42]);
  });

  it("judul yang sudah diubah tetap dikenali dari HST-nya", () => {
    const existing = [{ hst: 38, title: "Kocor NPK (hujan, mundur)" }];
    expect(uncoveredSlots({ ...base, existing })).toEqual([30, 42]);
  });

  it("tugas di petak berikutnya tidak menutupi petak sebelumnya", () => {
    const existing = [{ hst: 36, title: "lain" }];
    expect(uncoveredSlots({ ...base, existing })).toEqual([30, 42]);
  });
});
