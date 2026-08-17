/**
 * Kode cuaca BMKG, dalam kata yang dipakai orang yang sedang berdiri di kebun.
 *
 * BMKG memakai penomoran yang searah WMO — 0/1 cerah, 2/3 berawan, 60-an hujan,
 * 95 ke atas badai — jadi pemetaan ini juga masih benar kalau suatu hari
 * sumbernya ditambah atau diganti.
 *
 * Dikelompokkan kasar: bedanya "hujan ringan" dan "hujan sedang" tidak mengubah
 * keputusan menyemprot, dan ramalan yang butuh legenda adalah ramalan yang tidak
 * dibaca siapa pun. Yang menentukan bukan namanya melainkan milimeternya.
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

export type ForecastSlot = {
  /** Waktu setempat, "2026-08-17 16:00" — tanpa offset, jadi jamnya dibaca apa adanya. */
  time: string;
  code: number;
  /** Milimeter pada slot itu. */
  mm: number;
};

export type DayWindow = {
  /** "2026-08-17" */
  date: string;
  /** Cuaca paling menentukan di jam kerja — bukan sepanjang hari. */
  kind: WeatherKind;
  /** Total milimeter yang diramalkan turun di jam kerja. */
  rainMm: number;
  /** Ada kode badai di jam kerja. */
  storm: boolean;
  /**
   * Berapa slot jam kerja yang datanya terbaca. Nol berarti tidak bisa
   * disimpulkan — dan itu keadaan yang wajar terjadi, bukan kegagalan: ramalan
   * BMKG bergerak maju sepanjang hari, jadi lewat pukul lima sore hari ini
   * memang tidak punya jam kerja tersisa untuk diramalkan.
   */
  slots: number;
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
 * sepanjang sore bisa membilas lebih banyak daripada sekali hujan sedang.
 */
export function summariseDay(date: string, slots: ForecastSlot[]): DayWindow {
  const inWindow = slots.filter(
    (slot) => dateOf(slot.time) === date && inSprayHours(slot.time)
  );

  const worst = inWindow.reduce<number>((code, slot) => {
    const rank = (value: number) =>
      value >= 95 ? 4 : value >= 51 ? 3 : value >= 2 ? 2 : 1;
    return rank(slot.code) > rank(code) ? slot.code : code;
  }, 0);

  return {
    date,
    kind: weatherKind(worst),
    // Dibulatkan ke satu desimal: milimeter dengan empat angka di belakang koma
    // memberi kesan ketepatan yang tidak dimiliki ramalan mana pun.
    rainMm: Math.round(inWindow.reduce((sum, slot) => sum + slot.mm, 0) * 10) / 10,
    storm: inWindow.some((slot) => slot.code >= 95),
    slots: inWindow.length,
  };
}

/**
 * Jendela nyemprot terdekat yang masih bisa diramalkan.
 *
 * Bukan selalu hari ini, dan itu keputusan yang lahir dari bentuk data BMKG:
 * ramalannya bergerak maju sepanjang hari, jadi dibuka pukul enam sore hari ini
 * sudah tidak punya jam kerja tersisa. Bertahan pada "hari ini" akan membuat
 * kartunya bungkam setiap malam — padahal jam enam sore pertanyaannya memang
 * sudah bergeser ke besok.
 */
export function nextSprayWindow<T extends DayWindow>(days: T[]): T | null {
  return days.find((day) => day.slots > 0) ?? null;
}

export type SprayVerdict = "AMAN" | "HATI_HATI" | "JANGAN" | "TIDAK_TAHU";

/**
 * Boleh menyemprot atau tidak, dan yang memutuskan cuma milimeter.
 *
 * BMKG tidak menerbitkan peluang hujan, hanya jumlahnya — dan setelah dipikir
 * lagi itu memang yang lebih penting dari keduanya. Peluang 71% untuk gerimis
 * 0,1 mm pernah membuat kartu ini menyuruh menunda di hari yang tidak turun
 * hujan sedikit pun; yang menentukan apakah racikan terbilas selalu berapa
 * airnya, bukan seberapa yakin ramalannya.
 *
 * Yang hilang adalah kemampuan membedakan "banyak tapi belum pasti" dari
 * "banyak dan hampir pasti". Keduanya kini sama-sama menahan penyemprotan, dan
 * itu memang lebih berhati-hati daripada sebaliknya.
 */
export function sprayVerdict(day: DayWindow): SprayVerdict {
  if (day.slots === 0) return "TIDAK_TAHU";
  if (day.storm) return "JANGAN";

  // Titik-titik air yang tidak mengalir tidak membawa apa pun turun.
  if (day.rainMm < RAIN_TRACE_MM) return "AMAN";
  if (day.rainMm >= RAIN_WASHOUT_MM) return "JANGAN";

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
  if (day.slots === 0) return "";

  const window = `jam ${SPRAY_HOURS.from}–${SPRAY_HOURS.to}`;

  if (day.rainMm === 0) return `Nggak ada hujan diramalkan ${window}.`;

  if (day.rainMm < RAIN_TRACE_MM) {
    return `Cuma ${formatMm(day.rainMm)} ${window} — nggak cukup buat membilas.`;
  }

  return `Diramalkan ${formatMm(day.rainMm)} ${window}.`;
}

/** Koma, seperti seluruh angka lain di aplikasi ini. */
export function formatMm(value: number): string {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} mm`;
}
