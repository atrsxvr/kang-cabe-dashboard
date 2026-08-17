import { describe, expect, it } from "vitest";

import {
  isOutlier,
  spreadOf,
  stabilityOf,
  zScoreOf,
  type Spread,
} from "@/lib/spread";

describe("spreadOf", () => {
  it("computes the sample standard deviation, not the population one", () => {
    // Rata-rata 5. Selisih kuadrat berjumlah 10; dibagi n−1 = 4 → 2,5.
    const spread = spreadOf([3, 4, 5, 6, 7]);

    expect(spread?.mean).toBe(5);
    expect(spread?.sd).toBeCloseTo(Math.sqrt(2.5), 10);
    // Dibagi n akan menghasilkan √2 = 1,414 — lebih kecil, dan selalu ke arah
    // yang lebih enak dilihat.
    expect(spread?.sd).not.toBeCloseTo(Math.sqrt(2), 3);
  });

  /**
   * Angka nyata dari Musim Tanam 1 sebagai jaring pengaman: 19 petikan Bagus
   * yang naik dari 3,6 kg, memuncak 15,4 kg, lalu turun ke sekitar 2 kg.
   */
  it("matches the reference season", () => {
    const spread = spreadOf([
      3.6, 9.8, 15.4, 8.7, 5.6, 6, 3.2, 5.5, 5.97, 1.58, 6.5, 6.7, 7.15, 5.75,
      7.64, 2.04, 1.18, 1.8, 2.985,
    ]);

    expect(spread?.count).toBe(19);
    expect(spread?.mean).toBeCloseTo(5.64, 2);
    expect(spread?.sd).toBeCloseTo(3.43, 2);
    expect(spread?.cv).toBeCloseTo(0.61, 2);
    expect(spread?.min).toBe(1.18);
    expect(spread?.max).toBe(15.4);
  });

  /**
   * Dengan dua atau tiga petikan, satu angka meleset menggeser seluruh
   * hasilnya dan tidak ada cara membacanya sebagai apa pun. Menolak lebih
   * jujur daripada menerbitkan angka yang kebetulan terhitung.
   */
  it("refuses to describe a spread from too few pickings", () => {
    expect(spreadOf([5, 7, 6])).toBeNull();
    expect(spreadOf([])).toBeNull();
    expect(spreadOf([5, 7, 6, 8])).not.toBeNull();
  });

  it("has no coefficient of variation when nothing was picked", () => {
    const spread = spreadOf([0, 0, 0, 0]);

    expect(spread?.mean).toBe(0);
    expect(spread?.cv).toBeNull();
  });
});

describe("zScoreOf", () => {
  const spread = spreadOf([3, 4, 5, 6, 7]) as Spread;

  it("is zero at the mean and signed either side", () => {
    expect(zScoreOf(5, spread)).toBe(0);
    expect(zScoreOf(7, spread)).toBeGreaterThan(0);
    expect(zScoreOf(3, spread)).toBeLessThan(0);
  });

  /**
   * Empat petikan yang persis sama tidak punya sebaran untuk dibagi. Tanpa ini
   * hasilnya Infinity, dan tiap petikan dinyatakan pencilan sekaligus.
   */
  it("stays silent when every picking was identical", () => {
    const flat = spreadOf([6, 6, 6, 6]) as Spread;

    expect(flat.sd).toBe(0);
    expect(zScoreOf(6, flat)).toBeNull();
    expect(isOutlier(6, flat)).toBe(false);
  });
});

describe("isOutlier", () => {
  const spread = spreadOf([
    3.6, 9.8, 15.4, 8.7, 5.6, 6, 3.2, 5.5, 5.97, 1.58, 6.5, 6.7, 7.15, 5.75,
    7.64, 2.04, 1.18, 1.8, 2.985,
  ]) as Spread;

  it("marks the peak that sits beyond two deviations", () => {
    expect(isOutlier(15.4, spread)).toBe(true);
  });

  /**
   * Dan tidak menandai ekor musim. Petikan 1,18 kg itu memang kecil, tapi ia
   * bagian dari penurunan menjelang musim habis — bukan kejadian aneh yang
   * perlu dicari sebabnya. Menandainya akan mengubah kartu ini jadi alarm yang
   * berbunyi tiap akhir musim, dan alarm yang selalu berbunyi tidak dibaca.
   */
  it("leaves the season's natural tail alone", () => {
    expect(isOutlier(1.18, spread)).toBe(false);
    expect(isOutlier(2.04, spread)).toBe(false);
  });
});

describe("stabilityOf", () => {
  it("reads a coefficient of variation as words", () => {
    expect(stabilityOf(0.12)).toBe("STABIL");
    expect(stabilityOf(0.35)).toBe("SEDANG");
    expect(stabilityOf(0.61)).toBe("BERAYUN");
  });

  it("says nothing when there is no coefficient to read", () => {
    expect(stabilityOf(null)).toBeNull();
  });
});
