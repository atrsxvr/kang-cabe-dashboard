/**
 * WMO weather codes, in the words someone standing in a garden would use.
 *
 * Collapsed hard: the difference between "light drizzle" and "moderate
 * drizzle" changes nothing about whether you spray today, and a forecast that
 * needs a legend is a forecast nobody reads.
 */
export type WeatherKind = "CERAH" | "BERAWAN" | "HUJAN" | "BADAI";

export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return "CERAH";
  if (code === 2 || code === 3 || code === 45 || code === 48) return "BERAWAN";
  if (code >= 95) return "BADAI";
  return "HUJAN";
}

export const weatherLabels: Record<WeatherKind, string> = {
  CERAH: "Cerah",
  BERAWAN: "Berawan",
  HUJAN: "Hujan",
  BADAI: "Badai petir",
};

/**
 * Jam kerja penyemprotan, waktu setempat.
 *
 * Ini ada karena kesalahan yang pernah terjadi: kartunya membaca peluang hujan
 * **tertinggi sepanjang 24 jam**, lalu menyuruh menunda penyemprotan di hari
 * yang kering total — gara-gara gerimis 0,1 mm jam sepuluh malam. Tidak ada
 * yang menyemprot jam sepuluh malam, jadi jam itu tidak boleh ikut memutuskan.
 */
export const SPRAY_HOURS = { from: 6, to: 17 } as const;

/**
 * Di bawah ini hujannya tidak membilas apa pun.
 *
 * Nol koma satu milimeter itu embun yang menempel di daun, bukan air yang
 * mengalir turun. Memperlakukannya sama dengan hujan sungguhan membuat
 * peringatannya berbunyi hampir tiap hari di musim penghujan — dan peringatan
 * yang selalu berbunyi berhenti dibaca.
 */
export const RAIN_TRACE_MM = 0.5;

/**
 * Di atas ini racikan yang baru disemprot ikut turun.
 *
 * Dua milimeter dalam sejam sudah membuat air mengalir di permukaan daun.
 * Angkanya kasar dan memang tidak perlu tepat: yang dipertaruhkan satu trip
 * menyemprot, bukan keputusan yang tidak bisa diulang.
 */
export const RAIN_WASHOUT_MM = 2;

/** Peluang yang sudah cukup tinggi untuk dilihat langitnya dulu. */
export const RAIN_CHANCE_WATCH = 60;

export type HourlyRow = {
  /** Waktu setempat, "2026-08-17T14:00" — tanpa offset, jadi jamnya dibaca apa adanya. */
  time: string;
  code: number;
  /** Milimeter pada jam itu. */
  mm: number;
  /** Persen. */
  chance: number;
};

export type DayWindow = {
  /** "2026-08-17" */
  date: string;
  /** Cuaca paling menentukan di jam kerja — bukan sepanjang hari. */
  kind: WeatherKind;
  /** Total milimeter yang diramalkan turun di jam kerja. */
  rainMm: number;
  /** Peluang tertinggi di jam kerja, persen. */
  rainChance: number;
  /** Ada kode badai di jam kerja. */
  storm: boolean;
  /** Berapa jam kerja yang datanya terbaca. Nol berarti tidak bisa disimpulkan. */
  hours: number;
};

const hourOf = (time: string) => Number(time.slice(11, 13));
export const dateOf = (time: string) => time.slice(0, 10);

const inSprayHours = (time: string) => {
  const hour = hourOf(time);
  return hour >= SPRAY_HOURS.from && hour <= SPRAY_HOURS.to;
};

/**
 * Meringkas satu hari, hanya dari jam-jam kerjanya.
 *
 * Jumlah milimeternya ditotal, bukan diambil yang tertinggi: gerimis tipis
 * sepanjang sore bisa membilas lebih banyak daripada satu jam hujan sedang.
 * Peluangnya justru diambil yang tertinggi — satu jam dengan peluang 80% sudah
 * cukup untuk menunda, meski rata-rata sehari itu rendah.
 */
export function summariseDay(date: string, rows: HourlyRow[]): DayWindow {
  const hours = rows.filter(
    (row) => dateOf(row.time) === date && inSprayHours(row.time)
  );

  const worst = hours.reduce<number>((code, row) => {
    const rank = (value: number) =>
      value >= 95 ? 4 : value >= 51 ? 3 : value >= 2 ? 2 : 1;
    return rank(row.code) > rank(code) ? row.code : code;
  }, 0);

  return {
    date,
    kind: weatherKind(worst),
    // Dibulatkan ke satu desimal: milimeter dengan empat angka di belakang koma
    // memberi kesan ketepatan yang tidak dimiliki ramalan mana pun.
    rainMm: Math.round(hours.reduce((sum, row) => sum + row.mm, 0) * 10) / 10,
    rainChance: hours.reduce((max, row) => Math.max(max, row.chance), 0),
    storm: hours.some((row) => row.code >= 95),
    hours: hours.length,
  };
}

export type SprayVerdict = "AMAN" | "HATI_HATI" | "JANGAN" | "TIDAK_TAHU";

/**
 * Boleh menyemprot atau tidak, dari dua angka yang berbeda perannya.
 *
 * Peluang saja tidak cukup — 71% peluang gerimis 0,1 mm bukan alasan menunda,
 * dan itulah kekeliruan yang membuat kartu ini pernah menyuruh menunda di hari
 * yang tidak turun hujan sedikit pun. Milimeternya yang menentukan apakah
 * racikannya terbilas; peluangnya menentukan seberapa yakin.
 */
export function sprayVerdict(day: DayWindow): SprayVerdict {
  if (day.hours === 0) return "TIDAK_TAHU";
  if (day.storm) return "JANGAN";

  // Titik-titik air yang tidak mengalir tidak membawa apa pun turun, seberapa
  // pun yakinnya ramalan bahwa ia akan ada.
  if (day.rainMm < RAIN_TRACE_MM) return "AMAN";

  // Menahan seseorang dari pekerjaannya butuh dua-duanya: hujan yang cukup
  // besar untuk membilas, dan ramalan yang cukup yakin hujan itu turun.
  if (day.rainMm >= RAIN_WASHOUT_MM && day.rainChance >= RAIN_CHANCE_WATCH) {
    return "JANGAN";
  }

  return "HATI_HATI";
}

export const sprayAdviceText: Record<SprayVerdict, string> = {
  AMAN: "Aman buat nyemprot.",
  HATI_HATI: "Bisa nyemprot, tapi lihat langit dulu.",
  JANGAN: "Jangan nyemprot dulu — racikannya bakal keguyur.",
  TIDAK_TAHU: "Ramalan per jamnya belum ada, jadi belum bisa disimpulkan.",
};

/**
 * Angka di balik vonisnya, supaya bisa diperiksa.
 *
 * Kartu yang cuma bilang "jangan nyemprot" tanpa menyebut dasarnya tidak bisa
 * dibantah waktu ia keliru — dan waktu ia keliru, yang membacanya berhenti
 * memercayainya untuk selamanya.
 */
export function sprayReason(day: DayWindow): string {
  if (day.hours === 0) return "";

  const window = `jam ${SPRAY_HOURS.from}–${SPRAY_HOURS.to}`;

  // Nol milimeter dengan peluang di atas nol itu hal yang wajar: modelnya
  // melihat kemungkinan hujan tanpa meramalkan air yang benar-benar turun.
  // "Cuma 0 mm" bukan kalimat yang bisa dibaca siapa pun.
  if (day.rainMm === 0) {
    return day.rainChance > 0
      ? `Ada peluang ${day.rainChance}% ${window}, tapi nggak ada hujan yang diramalkan turun.`
      : `Nggak ada hujan diramalkan ${window}.`;
  }

  if (day.rainMm < RAIN_TRACE_MM) {
    return `Cuma ${formatMm(day.rainMm)} ${window} (peluang ${day.rainChance}%) — nggak cukup buat membilas.`;
  }

  return `Diramalkan ${formatMm(day.rainMm)} ${window}, peluang tertinggi ${day.rainChance}%.`;
}

/** Koma, seperti seluruh angka lain di aplikasi ini. */
export function formatMm(value: number): string {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} mm`;
}
