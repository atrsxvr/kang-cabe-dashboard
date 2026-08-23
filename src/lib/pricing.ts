/**
 * Harga lantai: berapa paling murah satu kilo boleh dilepas.
 *
 * Seluruh isi berkas ini bertumpu pada satu angka — BEP, modal per kilo — dan
 * mengalikannya dengan porsi untung yang sudah disepakati. Tidak ada yang
 * disimpan: begitu biaya atau proyeksi panen berubah, lantainya ikut bergerak,
 * dan lantai yang tersimpan pasti akan ketinggalan dari biaya yang membentuknya.
 *
 * Ada dua BEP dan keduanya perlu ditampilkan:
 *
 * - **Real-time** membagi biaya dengan kilo yang sudah terpetik. Jujur soal
 *   hari ini, tapi berayun keras di awal musim ketika biaya sudah keluar dan
 *   panennya belum datang.
 * - **Proyeksi** membagi biaya yang sama dengan seluruh panen yang diharapkan.
 *   Inilah yang dipakai menentukan harga, karena begitulah cara modal
 *   sebenarnya tersebar — pupuk yang ditebar bulan lalu ikut menghidupi buah
 *   yang dipetik bulan depan.
 *
 * Proyeksi selalu lebih rendah selama musim masih jalan, dan itu memang
 * disengaja — tapi pembilangnya baru berisi biaya sampai hari ini sementara
 * penyebutnya sudah memasukkan panen yang belum terjadi. Jadi ia akan merangkak
 * naik sampai musim tutup, dan yang real-time ditampilkan di sebelahnya persis
 * supaya selisih itu kelihatan, bukan tersembunyi.
 */

import { roundUpToCash } from "@/lib/money";

export type PriceTierKey = "PREMIUM" | "HEALTHY" | "MINIMUM" | "FLOOR";

export type PriceTierSpec = {
  key: PriceTierKey;
  label: string;
  /** Kelipatan BEP yang jadi batas bawah tier ini. */
  multiplier: number;
  strategy: string;
};

/**
 * Kesepakatan empat orang, bukan rumus dari mana-mana.
 *
 * Ditulis di kode dan bukan di database karena mengubahnya adalah keputusan
 * yang perlu dibicarakan, bukan kolom yang digeser sendirian sore-sore. Kalau
 * suatu saat memang perlu diatur dari Settings, pindahkan berikut alasan
 * kenapa angkanya berubah.
 *
 * Persentasenya markup di atas modal, bukan margin terhadap harga jual —
 * 150% BEP berarti untung setengah modal, yang jatuhnya 33% dari uang yang
 * diterima. Halaman Keuangan sudah memakai kata "margin kotor" untuk arti yang
 * kedua, jadi label di sini sengaja tidak memakai kata itu.
 */
export const PRICE_TIERS: PriceTierSpec[] = [
  {
    key: "PREMIUM",
    label: "Premium",
    multiplier: 1.5,
    strategy: "Buat pembeli baru atau cabai mulus",
  },
  {
    key: "HEALTHY",
    label: "Lantai Sehat",
    multiplier: 1.35,
    strategy: "Nego normal — masih untung enak",
  },
  {
    key: "MINIMUM",
    label: "Lantai Minimum",
    multiplier: 1.2,
    strategy: "Mentok — untung tipis",
  },
  {
    key: "FLOOR",
    label: "Jangan Dilepas",
    multiplier: 1,
    strategy: "Tahan, kecuali sudah kepepet busuk",
  },
];

export type PriceTier = PriceTierSpec & {
  /** Harga terendah yang masih masuk tier ini, rupiah bulat. */
  minPrice: number;
};

/**
 * Modal per kilo terhadap seluruh panen yang diharapkan.
 *
 * Null kalau proyeksinya belum diisi — menebaknya akan menghasilkan harga
 * lantai palsu, dan lantai palsu lebih berbahaya daripada tidak ada panduan.
 *
 * Null juga kalau belum ada biaya tercatat. Nol bukan "modalnya murah sekali",
 * melainkan "belum ada yang dicatat" — dan kalau diteruskan, seluruh tier
 * jatuh ke Rp 0 dan harga berapa pun dinyatakan Premium. Musim yang belanjanya
 * belum diketik akan memuji penjualan seribu rupiah sekilo.
 */
export function projectedBep(
  totalCost: number,
  projectedHarvestKg: number | null
): number | null {
  if (projectedHarvestKg === null || projectedHarvestKg <= 0) return null;
  if (totalCost <= 0) return null;
  return Math.round(totalCost / projectedHarvestKg);
}

/**
 * Harga minimum tiap tier.
 *
 * Dibulatkan **ke atas** ke pecahan lima ratus, seperti seluruh angka uang yang
 * berpindah tangan di kebun ini. Ke atas karena ini lantai: membulatkan sebuah
 * batas bawah ke bawah akan menaruhnya di bawah batas itu sendiri.
 */
export function priceTiers(bep: number): PriceTier[] {
  return PRICE_TIERS.map((tier) => ({
    ...tier,
    minPrice: roundUpToCash(Math.round(bep * tier.multiplier)),
  }));
}

export type PriceVerdict = {
  tier: PriceTier;
  /** Di bawah modal — bukan untung tipis, tapi rugi tiap kilonya. */
  belowCost: boolean;
  /** Selisih terhadap lantai minimum yang disepakati, rupiah per kilo. */
  againstMinimum: number;
};

/**
 * Sebuah harga jatuh di tier mana.
 *
 * Dicocokkan ke `minPrice` yang sudah dibulatkan, bukan ke `bep × multiplier`
 * mentah, supaya angka yang dipajang di tabel itu jugalah yang menghakimi.
 * Kalau tidak, harga yang persis sama dengan lantai yang tertulis bisa
 * dinyatakan di bawah lantai, dan tidak ada yang bisa menjelaskannya.
 */
export function verdictFor(price: number, bep: number): PriceVerdict {
  const tiers = priceTiers(bep);
  const minimum = tiers.find((tier) => tier.key === "MINIMUM");

  const tier =
    tiers.find((row) => price >= row.minPrice) ?? tiers[tiers.length - 1];

  return {
    tier,
    belowCost: price < bep,
    againstMinimum: price - (minimum?.minPrice ?? bep),
  };
}
