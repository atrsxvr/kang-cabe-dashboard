import { describe, expect, it } from "vitest";

import {
  RAIN_TRACE_MM,
  RAIN_WASHOUT_MM,
  sprayReason,
  sprayVerdict,
  summariseDay,
  weatherKind,
  type DayWindow,
  type HourlyRow,
} from "@/lib/weather";

const hour = (time: string, mm: number, chance: number, code = 51): HourlyRow => ({
  time,
  mm,
  chance,
  code,
});

const day = (over: Partial<DayWindow> = {}): DayWindow => ({
  date: "2026-08-17",
  kind: "BERAWAN",
  rainMm: 0,
  rainChance: 0,
  storm: false,
  hours: 12,
  ...over,
});

describe("weatherKind", () => {
  it("reads the codes a garden actually cares about", () => {
    expect(weatherKind(0)).toBe("CERAH");
    expect(weatherKind(3)).toBe("BERAWAN");
    expect(weatherKind(51)).toBe("HUJAN");
    expect(weatherKind(95)).toBe("BADAI");
  });
});

describe("summariseDay", () => {
  /**
   * Angka nyata dari hari yang membuat semua ini dibangun ulang: kering dari
   * subuh sampai malam, lalu gerimis 0,1 mm dengan peluang 71% jam sepuluh
   * malam. Membaca peluang tertinggi sepanjang 24 jam menghasilkan 71%; membaca
   * jam kerjanya saja menghasilkan 12%.
   */
  it("ignores the small hours that nobody sprays in", () => {
    const rows: HourlyRow[] = [
      hour("2026-08-17T00:00", 0, 20),
      hour("2026-08-17T06:00", 0, 2, 3),
      hour("2026-08-17T12:00", 0, 0, 0),
      hour("2026-08-17T17:00", 0, 12, 3),
      hour("2026-08-17T21:00", 0.1, 59),
      hour("2026-08-17T22:00", 0, 71),
    ];

    const summary = summariseDay("2026-08-17", rows);

    expect(summary.rainChance).toBe(12);
    expect(summary.rainMm).toBe(0);
    expect(summary.hours).toBe(3);
  });

  it("keeps only the day it was asked about", () => {
    const rows: HourlyRow[] = [
      hour("2026-08-17T12:00", 5, 90),
      hour("2026-08-18T12:00", 0, 0, 0),
    ];

    expect(summariseDay("2026-08-18", rows).rainMm).toBe(0);
  });

  /**
   * Ditotal, bukan diambil yang tertinggi. Gerimis tipis sepanjang sore
   * membilas lebih banyak daripada satu jam hujan sedang, dan mengambil yang
   * tertinggi akan melaporkan sore itu sebagai 0,4 mm.
   */
  it("adds the hours up instead of taking the worst one", () => {
    const rows = [
      hour("2026-08-17T13:00", 0.4, 70),
      hour("2026-08-17T14:00", 0.4, 70),
      hour("2026-08-17T15:00", 0.4, 70),
      hour("2026-08-17T16:00", 0.4, 70),
    ];

    expect(summariseDay("2026-08-17", rows).rainMm).toBe(1.6);
  });

  it("takes the most telling sky in working hours, not across midnight", () => {
    const rows = [
      hour("2026-08-17T09:00", 0, 0, 0),
      hour("2026-08-17T14:00", 3, 80, 95),
      hour("2026-08-17T23:00", 0, 10, 3),
    ];

    const summary = summariseDay("2026-08-17", rows);

    expect(summary.kind).toBe("BADAI");
    expect(summary.storm).toBe(true);
  });

  it("says it read nothing when the window has no data", () => {
    expect(summariseDay("2026-08-17", []).hours).toBe(0);
  });
});

describe("sprayVerdict", () => {
  /**
   * Kekeliruan yang dijaga di sini, dan yang dilaporkan dari lapangan: kartunya
   * menyuruh menunda penyemprotan di hari yang tidak turun hujan sedikit pun,
   * karena 71% peluang gerimis 0,1 mm dibaca sebagai "bakal keguyur".
   */
  it("does not hold up work for rain that cannot wash anything off", () => {
    expect(sprayVerdict(day({ rainMm: 0.1, rainChance: 71 }))).toBe("AMAN");
    expect(sprayVerdict(day({ rainMm: 0, rainChance: 90 }))).toBe("AMAN");
  });

  it("holds up work when the rain is both real and likely", () => {
    expect(sprayVerdict(day({ rainMm: 5, rainChance: 80 }))).toBe("JANGAN");
  });

  /**
   * Butuh dua-duanya. Ramalan yang menyebut angka besar tapi tidak yakin
   * hujannya turun belum cukup untuk membatalkan satu trip menyemprot.
   */
  it("only warns when the amount is there but the confidence is not", () => {
    expect(sprayVerdict(day({ rainMm: 5, rainChance: 30 }))).toBe("HATI_HATI");
  });

  it("warns in the middle ground between a trace and a washout", () => {
    expect(sprayVerdict(day({ rainMm: 1, rainChance: 80 }))).toBe("HATI_HATI");
  });

  it("refuses a thunderstorm outright, whatever the millimetres say", () => {
    expect(sprayVerdict(day({ storm: true, rainMm: 0, rainChance: 0 }))).toBe(
      "JANGAN"
    );
  });

  it("admits it cannot tell when the window is empty", () => {
    expect(sprayVerdict(day({ hours: 0 }))).toBe("TIDAK_TAHU");
  });

  it("keeps the thresholds it documents", () => {
    expect(sprayVerdict(day({ rainMm: RAIN_TRACE_MM - 0.01 }))).toBe("AMAN");
    expect(sprayVerdict(day({ rainMm: RAIN_TRACE_MM }))).toBe("HATI_HATI");
    expect(
      sprayVerdict(day({ rainMm: RAIN_WASHOUT_MM, rainChance: 60 }))
    ).toBe("JANGAN");
  });
});

describe("sprayReason", () => {
  /**
   * Vonis tanpa angkanya tidak bisa dibantah saat ia keliru — dan saat ia
   * keliru, yang membacanya berhenti memercayainya untuk selamanya.
   */
  it("names the figures behind a verdict", () => {
    expect(sprayReason(day({ rainMm: 5, rainChance: 80 }))).toContain("5 mm");
    expect(sprayReason(day({ rainMm: 5, rainChance: 80 }))).toContain("80%");
  });

  it("explains why a high chance was waved through", () => {
    const reason = sprayReason(day({ rainMm: 0.1, rainChance: 71 }));

    expect(reason).toContain("71%");
    // Koma, seperti seluruh angka lain di aplikasi ini.
    expect(reason).toContain("0,1 mm");
    expect(reason).toContain("membilas");
  });

  /**
   * Nol milimeter dengan peluang di atas nol itu wajar — modelnya melihat
   * kemungkinan tanpa meramalkan air yang turun. "Cuma 0 mm" bukan kalimat
   * yang bisa dibaca siapa pun, dan itu yang sempat tercetak.
   */
  it("does not write \"cuma 0 mm\"", () => {
    const reason = sprayReason(day({ rainMm: 0, rainChance: 12 }));

    expect(reason).toContain("12%");
    expect(reason).not.toContain("0 mm");
    expect(reason).toContain("nggak ada hujan yang diramalkan turun");
  });

  it("says plainly when nothing is forecast at all", () => {
    expect(sprayReason(day())).toContain("Nggak ada hujan");
  });

  it("stays quiet when there is nothing to explain", () => {
    expect(sprayReason(day({ hours: 0 }))).toBe("");
  });
});
