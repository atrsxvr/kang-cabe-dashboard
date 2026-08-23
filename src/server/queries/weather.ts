import "server-only";

import {
  dateOf,
  nextSprayWindow,
  summariseDay,
  weatherKind,
  type DayWindow,
  type ForecastSlot,
  type WeatherKind,
} from "@/lib/weather";

export type WeatherDay = DayWindow & {
  label: string;
  maxTemp: number;
  minTemp: number;
};

export type WeatherPlace = {
  desa: string;
  kecamatan: string;
  kotkab: string;
  provinsi: string;
  latitude: number;
  longitude: number;
};

export type WeatherNow = {
  /** Tempat yang benar-benar diramalkan BMKG, buat dicocokkan dengan kebun. */
  place: WeatherPlace;
  /** Langit pada slot terdekat — buat ditengok, bukan buat memutuskan. */
  kind: WeatherKind;
  temp: number;
  /**
   * Jendela nyemprot terdekat yang masih bisa diramalkan. Bisa besok kalau hari
   * ini jam kerjanya sudah lewat. Null berarti tidak ada yang bisa disimpulkan.
   */
  window: WeatherDay | null;
  days: WeatherDay[];
};

type BmkgSlot = {
  local_datetime?: string;
  t?: number;
  tp?: number;
  weather?: number;
};

type BmkgResponse = {
  lokasi?: {
    desa?: string;
    kecamatan?: string;
    kotkab?: string;
    provinsi?: string;
    lat?: number;
    lon?: number;
  };
  data?: { cuaca?: BmkgSlot[][] }[];
};

/**
 * Ramalan kebun, dari BMKG.
 *
 * Badan meteorologi negara ini sendiri, dan itu alasan utamanya: ramalannya
 * diturunkan ke tingkat desa dan disetel untuk kondisi Indonesia, bukan grid
 * global belasan kilometer. Terbukti bukan sekadar klaim — dua desa berjarak
 * lima kilometer mengembalikan angka yang berbeda.
 *
 * **Konsekuensi yang perlu diingat**, karena bentuk datanya berbeda dari
 * layanan global:
 *
 * - Tiga jam sekali, bukan sejam sekali. Jendela nyemprot berisi empat slot,
 *   bukan dua belas.
 * - Tidak ada peluang hujan sama sekali, hanya jumlahnya. Vonisnya jadi
 *   bertumpu pada milimeter saja — lihat `sprayVerdict`.
 * - Sekitar tiga hari, dan hari ini menyusut sepanjang hari berjalan. Itu
 *   sebabnya yang dipakai memutuskan adalah jendela terdekat, bukan hari ini.
 * - Dibatasi laju permintaan. Cache satu jam di bawah bukan penghematan,
 *   melainkan syarat.
 *
 * Mengembalikan null, bukan melempar — kartu cuaca hal paling tidak penting di
 * halaman ini, dan tidak boleh pernah jadi sebab dashboard gagal digambar.
 */
export async function getWeather(adm4: string): Promise<WeatherNow | null> {
  const url = new URL("https://api.bmkg.go.id/publik/prakiraan-cuaca");
  url.searchParams.set("adm4", adm4);

  try {
    const response = await fetch(url, {
      // BMKG membatasi laju permintaan, dan satu jam jauh lebih sering daripada
      // ramalannya sendiri diperbarui. Tanpa ini dashboard yang dibuka empat
      // orang bergantian akan kena 429.
      next: { revalidate: 3600 },
      headers: { "User-Agent": "kang-cabe-dashboard" },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as BmkgResponse;
    const lokasi = data.lokasi;
    const groups = data.data?.[0]?.cuaca;

    if (!lokasi?.desa || !groups) return null;

    // Datanya bersarang per hari, dan hari pertama sudah terpotong sesuai jam
    // sekarang. Diratakan dulu; pengelompokan ulang dilakukan lewat tanggalnya
    // sendiri, bukan lewat posisinya di dalam array.
    // Suhu tidak dipakai memutuskan apa pun, jadi ia menempel di sini saja
    // ketimbang mengotori ForecastSlot yang dipakai logika penyemprotan.
    type Slot = ForecastSlot & { temp: number };

    const slots: Slot[] = groups
      .flat()
      .filter((slot): slot is BmkgSlot & { local_datetime: string } =>
        Boolean(slot.local_datetime)
      )
      .map((slot) => ({
        time: slot.local_datetime,
        code: slot.weather ?? 0,
        mm: slot.tp ?? 0,
        temp: slot.t ?? 0,
      }));

    if (slots.length === 0) return null;

    const dates = [...new Set(slots.map((slot) => dateOf(slot.time)))];

    const days: WeatherDay[] = dates.map((date) => {
      const ofDay = slots.filter((slot) => dateOf(slot.time) === date);
      const temps = ofDay.map((slot) => slot.temp);

      return {
        ...summariseDay(date, slots),
        label: new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
          timeZone: "Asia/Jakarta",
        }).format(new Date(`${date}T00:00:00+07:00`)),
        maxTemp: Math.round(Math.max(...temps)),
        minTemp: Math.round(Math.min(...temps)),
      };
    });

    const soonest = slots[0];

    return {
      place: {
        desa: lokasi.desa,
        kecamatan: lokasi.kecamatan ?? "",
        kotkab: lokasi.kotkab ?? "",
        provinsi: lokasi.provinsi ?? "",
        latitude: lokasi.lat ?? 0,
        longitude: lokasi.lon ?? 0,
      },
      kind: weatherKind(soonest.code),
      temp: Math.round(soonest.temp),
      window: nextSprayWindow(days),
      days,
    };
  } catch (error) {
    console.error("Ramalan cuaca BMKG gagal diambil:", error);
    return null;
  }
}
