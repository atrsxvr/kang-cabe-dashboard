import "server-only";

import {
  dateOf,
  summariseDay,
  weatherKind,
  type DayWindow,
  type HourlyRow,
  type WeatherKind,
} from "@/lib/weather";

export type WeatherDay = DayWindow & {
  label: string;
  maxTemp: number;
  minTemp: number;
};

export type WeatherNow = {
  /** Langit saat ini — buat ditengok, bukan buat memutuskan. */
  kind: WeatherKind;
  temp: number;
  /** Hari ini di jam kerja. Inilah yang dipakai memutuskan menyemprot. */
  today: WeatherDay;
  days: WeatherDay[];
};

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; weather_code?: number };
  hourly?: {
    time?: string[];
    weather_code?: number[];
    precipitation?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

/**
 * Forecast for the garden, from Open-Meteo.
 *
 * Chosen because it needs no API key: one less secret to rotate, and one less
 * thing that stops working when a free tier lapses. Returns null rather than
 * throwing — a weather card is the least important thing on the page, and it
 * must never be the reason the dashboard fails to render.
 *
 * **Diambil per jam, bukan ringkasan harian**, dan itu bukan soal ketelitian
 * tapi soal benar-salah. Ringkasan harian Open-Meteo melaporkan peluang hujan
 * **tertinggi sepanjang 24 jam** dan kode cuaca **paling parah** sehari itu.
 * Untuk hujan konvektif sore atau gerimis tengah malam, keduanya mencap satu
 * hari kering sebagai hari hujan — dan kartunya pernah menyuruh menunda
 * penyemprotan gara-gara gerimis 0,1 mm jam sepuluh malam. Datanya benar sejak
 * awal; yang salah adalah pertanyaannya. Penyaringan ke jam kerja hanya bisa
 * dilakukan kalau jam-jamnya ada.
 */
export async function getWeather(
  latitude: number,
  longitude: number
): Promise<WeatherNow | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set(
    "hourly",
    "weather_code,precipitation,precipitation_probability"
  );
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  // Wajib: tanpa ini jamnya UTC, dan "jam 6 pagi" jatuh di jam 1 siang WIB.
  url.searchParams.set("timezone", "Asia/Jakarta");
  url.searchParams.set("forecast_days", "4");

  try {
    const response = await fetch(url, {
      // An hour is plenty: nobody re-plans spraying minute by minute, and this
      // keeps a busy dashboard from hammering someone else's free service.
      next: { revalidate: 3600 },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as OpenMeteoResponse;
    const hourly = data.hourly;
    const daily = data.daily;

    if (!data.current || !hourly?.time || !daily?.time) return null;

    const rows: HourlyRow[] = hourly.time.map((time, index) => ({
      time,
      code: hourly.weather_code?.[index] ?? 0,
      mm: hourly.precipitation?.[index] ?? 0,
      chance: hourly.precipitation_probability?.[index] ?? 0,
    }));

    const days: WeatherDay[] = daily.time.map((date, index) => ({
      ...summariseDay(date, rows),
      label: new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(`${date}T00:00:00+07:00`)),
      maxTemp: Math.round(daily.temperature_2m_max?.[index] ?? 0),
      minTemp: Math.round(daily.temperature_2m_min?.[index] ?? 0),
    }));

    // Hari pertama yang dikembalikan API selalu hari ini di zona waktu yang
    // diminta, tapi dicari lewat tanggal jam pertamanya daripada diasumsikan.
    const todayDate = dateOf(rows[0]?.time ?? "");
    const today = days.find((day) => day.date === todayDate) ?? days[0];

    if (!today) return null;

    return {
      kind: weatherKind(data.current.weather_code ?? 0),
      temp: Math.round(data.current.temperature_2m ?? 0),
      today,
      days,
    };
  } catch (error) {
    console.error("Ramalan cuaca gagal diambil:", error);
    return null;
  }
}
