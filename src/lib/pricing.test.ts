import { describe, expect, it } from "vitest";

import { priceTiers, projectedBep, verdictFor } from "@/lib/pricing";

describe("projectedBep", () => {
  it("spreads the cost over the harvest still expected, not the one already picked", () => {
    // Rp 5.125.959 atas proyeksi 131,4 kg — bukan atas 104,21 kg yang sudah
    // terpetik, yang menghasilkan angka jauh lebih tinggi.
    expect(projectedBep(5_125_959, 131.4)).toBe(39_010);
  });

  /**
   * Menebak proyeksi yang belum diisi akan melahirkan harga lantai yang
   * kelihatan resmi padahal tidak berdasar apa pun. Lebih baik tidak ada
   * panduan daripada panduan karangan — yang memakainya sedang berdiri di
   * depan pengepul dan tidak sempat mempertanyakan angkanya.
   */
  it("refuses to guess when the projection is missing", () => {
    expect(projectedBep(5_125_959, null)).toBeNull();
  });

  it("refuses a projection of nothing rather than dividing by zero", () => {
    expect(projectedBep(5_125_959, 0)).toBeNull();
  });

  /**
   * Belum ada biaya tercatat bukan berarti modalnya nol. Diteruskan, seluruh
   * tier jatuh ke Rp 0 dan harga berapa pun lolos sebagai Premium — musim yang
   * belanjanya belum diketik akan memuji penjualan seribu rupiah sekilo.
   */
  it("stays quiet when no cost has been recorded yet", () => {
    expect(projectedBep(0, 131.4)).toBeNull();
  });
});

describe("priceTiers", () => {
  it("prices each tier off the agreed markup over cost", () => {
    const tiers = priceTiers(40_000);

    expect(tiers.map((tier) => [tier.key, tier.minPrice])).toEqual([
      ["PREMIUM", 60_000],
      ["HEALTHY", 54_000],
      ["MINIMUM", 48_000],
      ["FLOOR", 40_000],
    ]);
  });

  /**
   * Selalu ke atas. Ini batas bawah: membulatkan sebuah lantai ke bawah
   * menaruhnya di bawah lantai itu sendiri, dan seorang penjual yang menuruti
   * angka di layar akan melepas di bawah yang disepakati.
   */
  it("rounds a floor up to cash, never down", () => {
    // 39.019 × 1,2 = 46.822,8 → 47.000, bukan 46.500.
    expect(priceTiers(39_019)[2].minPrice).toBe(47_000);
    expect(priceTiers(39_019)[3].minPrice).toBe(39_500);
  });
});

describe("verdictFor", () => {
  const bep = 39_019;

  it("puts a strong price in the top tier", () => {
    expect(verdictFor(63_646, bep).tier.key).toBe("PREMIUM");
  });

  it("reads the tiers in order rather than stopping at the first match", () => {
    expect(verdictFor(53_000, bep).tier.key).toBe("HEALTHY");
    expect(verdictFor(48_000, bep).tier.key).toBe("MINIMUM");
    expect(verdictFor(42_000, bep).tier.key).toBe("FLOOR");
  });

  /**
   * The boundary that has to hold: a price typed to match the floor printed on
   * screen must be judged as meeting it. Comparing against the raw
   * `bep × multiplier` instead of the rounded figure would fail exactly the
   * price the card told someone to ask for.
   */
  it("accepts a price equal to the floor it printed", () => {
    const floor = priceTiers(bep)[1].minPrice;

    expect(verdictFor(floor, bep).tier.key).toBe("HEALTHY");
    expect(verdictFor(floor - 1, bep).tier.key).toBe("MINIMUM");
  });

  /**
   * Untung tipis dan rugi keduanya jatuh di tier terbawah, tapi keduanya bukan
   * hal yang sama — yang satu menahan barang, yang satu membakar uang.
   */
  it("separates thin from loss-making inside the bottom tier", () => {
    expect(verdictFor(40_000, bep)).toMatchObject({
      belowCost: false,
      tier: { key: "FLOOR" },
    });

    expect(verdictFor(35_000, bep)).toMatchObject({
      belowCost: true,
      tier: { key: "FLOOR" },
    });
  });

  it("measures the gap against the agreed minimum, either way", () => {
    const minimum = priceTiers(bep)[2].minPrice;

    expect(verdictFor(minimum + 3_000, bep).againstMinimum).toBe(3_000);
    expect(verdictFor(minimum - 2_000, bep).againstMinimum).toBe(-2_000);
  });
});
