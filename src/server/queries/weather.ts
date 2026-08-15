import "server-only";

import { weatherKind, type WeatherKind } from "@/lib/weather";

export type WeatherDay = {
  date: string;
  label: string;
  kind: WeatherKind;
  maxTemp: number;
  minTemp: number;
  rainChance: number;
};

export type WeatherNow = {
  kind: WeatherKind;
  temp: number;
  rainChance: number;
  days: WeatherDay[];
};

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

/**
 * Forecast for the garden, from Open-Meteo.
 *
 * Chosen because it needs no API key: one less secret to rotate, and one less
 * thing that stops working when a free tier lapses. Returns null rather than
 * throwing — a weather card is the least important thing on the page, and it
 * must never be the reason the dashboard fails to render.
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
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
  );
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
    const daily = data.daily;

    if (!data.current || !daily?.time) return null;

    const days: WeatherDay[] = daily.time.map((date, index) => ({
      date,
      label: new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(`${date}T00:00:00+07:00`)),
      kind: weatherKind(daily.weather_code?.[index] ?? 0),
      maxTemp: Math.round(daily.temperature_2m_max?.[index] ?? 0),
      minTemp: Math.round(daily.temperature_2m_min?.[index] ?? 0),
      rainChance: daily.precipitation_probability_max?.[index] ?? 0,
    }));

    return {
      kind: weatherKind(data.current.weather_code ?? 0),
      temp: Math.round(data.current.temperature_2m ?? 0),
      rainChance: days[0]?.rainChance ?? 0,
      days,
    };
  } catch (error) {
    console.error("Ramalan cuaca gagal diambil:", error);
    return null;
  }
}
