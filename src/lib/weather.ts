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
 * What the forecast means for the work, not what it means for the sky.
 *
 * Spraying in rain wastes the mix and the trip: it washes off before it can be
 * taken up. This is the one thing the forecast is actually for here.
 */
export function sprayAdvice(kind: WeatherKind, rainChance: number): string {
  if (kind === "BADAI") return "Jangan nyemprot. Tunda dulu.";
  if (kind === "HUJAN" || rainChance >= 60) {
    return "Kurang bagus buat nyemprot — kemungkinan keguyur.";
  }
  if (rainChance >= 30) return "Bisa nyemprot, tapi lihat langit dulu.";
  return "Aman buat nyemprot.";
}
