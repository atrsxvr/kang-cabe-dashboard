import { describe, expect, it } from "vitest";

import {
  RAIN_TRACE_MM,
  RAIN_WASHOUT_MM,
  nextSprayWindow,
  sprayReason,
  sprayVerdict,
  summariseDay,
  weatherKind,
  type DayWindow,
  type ForecastSlot,
} from "@/lib/weather";

/** BMKG menulis waktunya "2026-08-17 16:00:00", tanpa offset. */
const slot = (time: string, mm: number, code = 61): ForecastSlot => ({
  time,
  mm,
  code,
});

const day = (over: Partial<DayWindow> = {}): DayWindow => ({
  date: "2026-08-17",
  kind: "BERAWAN",
  rainMm: 0,
  storm: false,
  slots: 4,
  ...over,
});

describe("weatherKind", () => {
  /**
   * Kode BMKG searah WMO, dan tes ini memakai angka yang benar-benar dikirimnya:
   * 1 Cerah, 2 Cerah Berawan, 3 Berawan, 61 Hujan Ringan.
   */
  it("reads the codes BMKG actually sends", () => {
    expect(weatherKind(0)).toBe("CERAH");
    expect(weatherKind(1)).toBe("CERAH");
    expect(weatherKind(2)).toBe("BERAWAN");
    expect(weatherKind(3)).toBe("BERAWAN");
    expect(weatherKind(61)).toBe("HUJAN");
    expect(weatherKind(95)).toBe("BADAI");
  });
});

describe("summariseDay", () => {
  /**
   * Slot BMKG tiga jam sekali, dan yang di luar jam kerja tidak boleh ikut
   * memutuskan. Ini kekeliruan yang pernah terjadi dengan sumber sebelumnya:
   * gerimis jam sepuluh malam menahan penyemprotan sepanjang hari.
   */
  it("ignores the slots outside working hours", () => {
    const slots = [
      slot("2026-08-17 01:00:00", 3),
      slot("2026-08-17 07:00:00", 0, 1),
      slot("2026-08-17 13:00:00", 0, 1),
      slot("2026-08-17 16:00:00", 0, 2),
      slot("2026-08-17 19:00:00", 4),
      slot("2026-08-17 22:00:00", 5),
    ];

    const summary = summariseDay("2026-08-17", slots);

    expect(summary.rainMm).toBe(0);
    expect(summary.slots).toBe(3);
  });

  it("keeps only the day it was asked about", () => {
    const slots = [
      slot("2026-08-17 13:00:00", 5),
      slot("2026-08-18 13:00:00", 0, 1),
    ];

    expect(summariseDay("2026-08-18", slots).rainMm).toBe(0);
  });

  /**
   * Ditotal, bukan diambil yang tertinggi. Angka nyata dari BMKG untuk kebun
   * ini: 2,1 mm di slot 13:00 dan 2,1 mm lagi di slot 16:00 — keduanya di dalam
   * jam kerja, jadi sorenya 4,2 mm dan bukan 2,1 mm.
   */
  it("adds the slots up instead of taking the worst one", () => {
    const slots = [
      slot("2026-08-19 13:00:00", 2.1),
      slot("2026-08-19 16:00:00", 2.1),
    ];

    expect(summariseDay("2026-08-19", slots).rainMm).toBe(4.2);
  });

  it("takes the most telling sky in working hours, not across midnight", () => {
    const slots = [
      slot("2026-08-17 07:00:00", 0, 1),
      slot("2026-08-17 13:00:00", 3, 95),
      slot("2026-08-17 22:00:00", 0, 3),
    ];

    const summary = summariseDay("2026-08-17", slots);

    expect(summary.kind).toBe("BADAI");
    expect(summary.storm).toBe(true);
  });

  it("says it read nothing when the window has no slots", () => {
    expect(summariseDay("2026-08-17", []).slots).toBe(0);
  });
});

describe("nextSprayWindow", () => {
  /**
   * Ramalan BMKG bergerak maju sepanjang hari. Dibuka pukul enam sore, hari ini
   * sudah tidak punya jam kerja tersisa — dan bertahan pada "hari ini" akan
   * membuat kartunya bungkam setiap malam, padahal jam enam sore pertanyaannya
   * memang sudah bergeser ke besok.
   */
  it("skips a day whose working hours have already passed", () => {
    const today = day({ date: "2026-08-17", slots: 0 });
    const tomorrow = day({ date: "2026-08-18", slots: 4 });

    expect(nextSprayWindow([today, tomorrow])?.date).toBe("2026-08-18");
  });

  it("stays on today while its working hours are still ahead", () => {
    const today = day({ date: "2026-08-17", slots: 2 });
    const tomorrow = day({ date: "2026-08-18", slots: 4 });

    expect(nextSprayWindow([today, tomorrow])?.date).toBe("2026-08-17");
  });

  it("returns nothing when no day has a readable window", () => {
    expect(nextSprayWindow([day({ slots: 0 })])).toBeNull();
    expect(nextSprayWindow([])).toBeNull();
  });
});

describe("sprayVerdict", () => {
  /**
   * Kekeliruan yang dijaga di sini, dan yang dilaporkan dari lapangan: kartunya
   * menyuruh menunda penyemprotan di hari yang tidak turun hujan sedikit pun,
   * karena gerimis 0,1 mm dibaca sebagai "bakal keguyur".
   */
  it("does not hold up work for rain that cannot wash anything off", () => {
    expect(sprayVerdict(day({ rainMm: 0.1 }))).toBe("AMAN");
    expect(sprayVerdict(day({ rainMm: 0 }))).toBe("AMAN");
  });

  it("holds up work when enough rain is forecast to wash a mix off", () => {
    expect(sprayVerdict(day({ rainMm: 4.2 }))).toBe("JANGAN");
  });

  it("warns in the middle ground between a trace and a washout", () => {
    expect(sprayVerdict(day({ rainMm: 1 }))).toBe("HATI_HATI");
  });

  it("refuses a thunderstorm outright, whatever the millimetres say", () => {
    expect(sprayVerdict(day({ storm: true, rainMm: 0 }))).toBe("JANGAN");
  });

  it("admits it cannot tell when the window is empty", () => {
    expect(sprayVerdict(day({ slots: 0 }))).toBe("TIDAK_TAHU");
  });

  it("keeps the thresholds it documents", () => {
    expect(sprayVerdict(day({ rainMm: RAIN_TRACE_MM - 0.01 }))).toBe("AMAN");
    expect(sprayVerdict(day({ rainMm: RAIN_TRACE_MM }))).toBe("HATI_HATI");
    expect(sprayVerdict(day({ rainMm: RAIN_WASHOUT_MM }))).toBe("JANGAN");
  });
});

describe("sprayReason", () => {
  /**
   * Vonis tanpa angkanya tidak bisa dibantah saat ia keliru — dan saat ia
   * keliru, yang membacanya berhenti memercayainya untuk selamanya.
   */
  it("names the figure behind a verdict", () => {
    expect(sprayReason(day({ rainMm: 4.2 }))).toContain("4,2 mm");
  });

  it("explains why a trace was waved through", () => {
    const reason = sprayReason(day({ rainMm: 0.1 }));

    // Koma, seperti seluruh angka lain di aplikasi ini.
    expect(reason).toContain("0,1 mm");
    expect(reason).toContain("membilas");
  });

  it("says plainly when nothing is forecast at all", () => {
    expect(sprayReason(day())).toContain("Nggak ada hujan");
    expect(sprayReason(day())).not.toContain("0 mm");
  });

  it("stays quiet when there is nothing to explain", () => {
    expect(sprayReason(day({ slots: 0 }))).toBe("");
  });
});
