import { averagePrice, lineTotal, type ChiliGradeValue } from "@/lib/harvest";

/**
 * Harga jual Bagus dari hari ke hari, untuk grafik di tab Penjualan.
 *
 * Satu titik per **hari**, bukan per transaksi: dua pengepul di hari yang sama
 * adalah satu harga pasar hari itu, dan dua titik bertumpuk di satu tanggal
 * cuma membuat garisnya patah ke atas-bawah tanpa arti. Rentang terendah dan
 * tertinggi hari itu tetap dibawa, supaya selisih antar-pembeli tidak hilang.
 *
 * Bagus saja, sama seperti rata-rata di ubin halaman Panen: afkir belum pernah
 * laku, dan mencampurnya menyeret grafik ke harga mutu yang bukan target.
 */

export type PriceSale = {
  soldAt: Date;
  buyer: { name: string };
  items: { grade: ChiliGradeValue; weightKg: number; pricePerKg: number }[];
};

export type PricePoint = {
  /** Tanggalnya di Jakarta, `YYYY-MM-DD` — kunci pengelompokannya. */
  day: string;
  /** Kilo Bagus yang terjual hari itu. */
  kg: number;
  /**
   * Rata-rata tertimbang kilo, dihitung persis seperti rata-rata musim di
   * ubin "Sudah terjual": 10 kg seharga 30.000 lebih berat dari 1 kg seharga
   * 20.000.
   */
  price: number;
  low: number;
  high: number;
  /** Urut sesuai kemunculan pertamanya hari itu. */
  buyers: string[];
};

const jakartaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

export function priceTrend(sales: PriceSale[]): PricePoint[] {
  const days = new Map<
    string,
    { kg: number; amount: number; low: number; high: number; buyers: string[] }
  >();

  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.grade !== "GOOD" || item.weightKg <= 0) continue;

      const day = jakartaDay.format(sale.soldAt);
      const entry = days.get(day) ?? {
        kg: 0,
        amount: 0,
        low: item.pricePerKg,
        high: item.pricePerKg,
        buyers: [],
      };

      entry.kg += item.weightKg;
      entry.amount += lineTotal(item.weightKg, item.pricePerKg);
      entry.low = Math.min(entry.low, item.pricePerKg);
      entry.high = Math.max(entry.high, item.pricePerKg);
      if (!entry.buyers.includes(sale.buyer.name)) entry.buyers.push(sale.buyer.name);
      days.set(day, entry);
    }
  }

  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, entry]) => ({
      day,
      kg: entry.kg,
      price: averagePrice(entry.amount, entry.kg),
      low: entry.low,
      high: entry.high,
      buyers: entry.buyers,
    }));
}
