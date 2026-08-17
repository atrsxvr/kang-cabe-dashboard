/**
 * Seberapa rata hasil tiap petikan, dan petikan mana yang jauh dari kebiasaan.
 *
 * Total dan rata-rata tidak bisa membedakan kebun yang memberi 6 kg tiap minggu
 * dari kebun yang memberi 15 kg sekali lalu 1 kg tiga kali berikutnya. Dua-duanya
 * berakhir di angka yang sama, tapi yang kedua tidak bisa dijanjikan ke pembeli
 * mana pun.
 *
 * **Yang perlu diingat sebelum membaca angkanya.** Panen cabai tidak datar
 * sepanjang musim: naik pelan di awal, memuncak, lalu turun menjelang habis.
 * Sebagian dari sebaran yang terukur di sini adalah bentuk kurva itu sendiri,
 * bukan ketidakstabilan yang bisa diperbaiki. Karena itu angka ini menjawab
 * "seberapa besar ayunannya", dan bukan "petikan mana yang bermasalah" —
 * petikan pertama dan terakhir memang sepantasnya kecil.
 */

/**
 * Di bawah ini simpangan bakunya derau, bukan sebaran.
 *
 * Dengan dua atau tiga petikan, satu angka yang meleset menggeser seluruh
 * hasilnya, dan pembacanya tidak punya cara tahu itu terjadi.
 */
export const MIN_SESSIONS = 4;

export type Spread = {
  count: number;
  mean: number;
  /**
   * Simpangan baku **sampel**, dibagi n−1.
   *
   * Petikan yang tercatat adalah contoh dari musim yang masih berjalan, bukan
   * seluruh populasinya. Membagi dengan n memperlakukan yang belum terjadi
   * seolah sudah diketahui, dan hasilnya selalu sedikit lebih kecil dari
   * sebaran yang sebenarnya — persis ke arah yang menyenangkan untuk dilihat.
   */
  sd: number;
  /**
   * Simpangan baku dibagi rata-rata. Inilah satu-satunya angka di sini yang
   * bisa dibandingkan antar musim: kebun 5.000 pohon yang berayun 10 kg tidak
   * lebih goyah dari kebun 230 pohon yang berayun 3 kg, dan simpangan baku
   * telanjang akan bilang sebaliknya.
   *
   * Null kalau rata-ratanya nol — tidak ada yang bisa dibagi.
   */
  cv: number | null;
  min: number;
  max: number;
};

export function spreadOf(values: number[]): Spread | null {
  if (values.length < MIN_SESSIONS) return null;

  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1);
  const sd = Math.sqrt(variance);

  return {
    count,
    mean,
    sd,
    cv: mean > 0 ? sd / mean : null,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * Berapa simpangan baku sebuah petikan dari rata-rata.
 *
 * Null kalau semua petikan sama persis — tidak ada sebaran untuk mengukurnya,
 * dan membaginya menghasilkan tak terhingga.
 */
export function zScoreOf(value: number, spread: Spread): number | null {
  if (spread.sd === 0) return null;
  return (value - spread.mean) / spread.sd;
}

/** Di luar dua simpangan baku — jarang, jadi biasanya ada ceritanya. */
export function isOutlier(value: number, spread: Spread): boolean {
  const z = zScoreOf(value, spread);
  return z !== null && Math.abs(z) > 2;
}

export type Stability = "STABIL" | "SEDANG" | "BERAYUN";

/**
 * Terjemahan koefisien variasi ke kata.
 *
 * Ambangnya konvensi, bukan hukum: seperempat dan setengah dipilih karena
 * bulat dan mudah diingat, bukan karena ada penelitian yang menetapkannya.
 * Yang dipakai mengambil keputusan tetap angkanya, dan kata ini cuma pintu
 * masuk buat yang tidak terbiasa membaca persentase sebaran.
 */
export function stabilityOf(cv: number | null): Stability | null {
  if (cv === null) return null;
  if (cv < 0.25) return "STABIL";
  if (cv < 0.5) return "SEDANG";
  return "BERAYUN";
}

export const stabilityLabels: Record<Stability, string> = {
  STABIL: "Stabil",
  SEDANG: "Cukup berayun",
  BERAYUN: "Sangat berayun",
};
