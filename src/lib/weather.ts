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
 * **Tidak ada penjagaan jam.** Sehari dihitung utuh, dari slot pertama sampai
 * terakhir.
 *
 * Sebelumnya dibatasi jam 6–17, atas anggapan bahwa penyemprotan cuma terjadi
 * siang. Anggapan itu salah: aplikasi lewat pukul lima sore memang dilakukan,
 * dan menyaring jam-jam itu keluar berarti menyembunyikan hujan yang justru
 * paling relevan untuk penyemprotan sore.
 *
 * Yang dulu ditambal oleh penjagaan jam sekarang ditambal oleh dua hal lain,
 * dan keduanya lebih tepat sasaran:
 *
 * - **Ambang milimeter.** Gerimis 0,1 mm jam sepuluh malam — kasus yang memulai
 *   semuanya — tetap terbaca "aman", karena 0,1 mm di bawah `RAIN_TRACE_MM`.
 *   Dulu yang menjatuhkannya adalah membaca peluang, bukan jumlah.
 * - **Jam hujannya disebut.** Karena sehari kini dihitung utuh, hujan jam tiga
 *   pagi bisa membuat vonisnya berbunyi walau paginya kering. Karena itu
 *   `sprayReason` menyebutkan hujannya jatuh sekitar jam berapa, supaya yang
 *   membaca bisa memutuskan sendiri — bukan menuruti satu vonis untuk seluruh
 *   hari.
 */

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
  /** Cuaca paling menentukan sepanjang hari. */
  kind: WeatherKind;
  /** Total milimeter yang diramalkan turun sepanjang hari. */
  rainMm: number;
  /** Ada kode badai kapan pun hari itu. */
  storm: boolean;
  /**
   * Jam slot pertama dan terakhir yang diramalkan berhujan, waktu setempat.
   * Null kalau tidak ada hujan sama sekali.
   *
   * Ada karena penjagaan jamnya dilepas: satu vonis untuk seluruh hari tidak
   * bisa membedakan hujan subuh dari hujan sore, padahal keduanya sama sekali
   * berbeda artinya bagi orang yang berencana menyemprot pagi.
   */
  wetFromHour: number | null;
  wetToHour: number | null;
  /**
   * Berapa slot yang datanya terbaca untuk hari itu. Nol berarti tidak bisa
   * disimpulkan — wajar terjadi pada hari terakhir yang diramalkan BMKG, bukan
   * kegagalan.
   */
  slots: number;
};

const hourOf = (time: string) => Number(time.slice(11, 13));
export const dateOf = (time: string) => time.slice(0, 10);

/**
 * Meringkas satu hari, utuh.
 *
 * Jumlah milimeternya ditotal, bukan diambil yang tertinggi: gerimis tipis
 * sepanjang sore bisa membilas lebih banyak daripada sekali hujan sedang.
 */
export function summariseDay(date: string, slots: ForecastSlot[]): DayWindow {
  const ofDay = slots.filter((slot) => dateOf(slot.time) === date);

  const worst = ofDay.reduce<number>((code, slot) => {
    const rank = (value: number) =>
      value >= 95 ? 4 : value >= 51 ? 3 : value >= 2 ? 2 : 1;
    return rank(slot.code) > rank(code) ? slot.code : code;
  }, 0);

  const wetHours = ofDay
    .filter((slot) => slot.mm > 0)
    .map((slot) => hourOf(slot.time));

  return {
    date,
    kind: weatherKind(worst),
    // Dibulatkan ke satu desimal: milimeter dengan empat angka di belakang koma
    // memberi kesan ketepatan yang tidak dimiliki ramalan mana pun.
    rainMm: Math.round(ofDay.reduce((sum, slot) => sum + slot.mm, 0) * 10) / 10,
    storm: ofDay.some((slot) => slot.code >= 95),
    wetFromHour: wetHours.length > 0 ? Math.min(...wetHours) : null,
    wetToHour: wetHours.length > 0 ? Math.max(...wetHours) : null,
    slots: ofDay.length,
  };
}

/**
 * Hari terdekat yang masih punya ramalan.
 *
 * Hampir selalu hari ini sejak penjagaan jamnya dilepas — BMKG masih
 * mengembalikan slot malam untuk hari ini bahkan saat dibuka pukul sepuluh
 * malam. Tetap dicari lewat isinya, bukan diambil elemen pertama, karena hari
 * terakhir yang dikirim BMKG bisa datang tanpa slot sama sekali.
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
 * Angka di balik vonisnya, **dan jam berapa hujannya**.
 *
 * Kartu yang cuma bilang "jangan nyemprot" tanpa menyebut dasarnya tidak bisa
 * dibantah waktu ia keliru — dan waktu ia keliru, yang membacanya berhenti
 * memercayainya untuk selamanya.
 *
 * Jamnya wajib disebut sejak penjagaan jam dilepas. Satu vonis untuk seluruh
 * hari tidak bisa membedakan hujan subuh dari hujan sore; tanpa jamnya, "jangan
 * nyemprot" gara-gara hujan jam tiga pagi akan membatalkan penyemprotan pagi
 * yang sebenarnya aman — kekeliruan yang sama dengan yang sudah dibetulkan,
 * cuma berpindah tempat.
 */
export function sprayReason(day: DayWindow): string {
  if (day.slots === 0) return "";

  // Tanpa menyebut harinya: vonis di atasnya sudah menyebut "Hari ini" atau
  // nama harinya, dan mengulangnya di sini justru terbaca seperti hari lain.
  if (day.rainMm === 0) return "Nggak ada hujan diramalkan.";

  const when = describeWetHours(day);

  if (day.rainMm < RAIN_TRACE_MM) {
    return `Cuma ${formatMm(day.rainMm)}${when} — nggak cukup buat membilas.`;
  }

  return `Diramalkan ${formatMm(day.rainMm)}${when}.`;
}

/** " sekitar jam 13–16", atau " sekitar jam 13" kalau cuma satu slot. */
function describeWetHours(day: DayWindow): string {
  if (day.wetFromHour === null || day.wetToHour === null) return "";

  const pad = (hour: number) => String(hour).padStart(2, "0");

  return day.wetFromHour === day.wetToHour
    ? ` sekitar jam ${pad(day.wetFromHour)}`
    : ` sekitar jam ${pad(day.wetFromHour)}–${pad(day.wetToHour)}`;
}

/** Koma, seperti seluruh angka lain di aplikasi ini. */
export function formatMm(value: number): string {
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} mm`;
}
