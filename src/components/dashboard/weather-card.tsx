import Link from "next/link";
import { Cloud, CloudRain, CloudSun, Sun, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  SPRAY_HOURS,
  formatMm,
  sprayAdviceText,
  sprayReason,
  sprayVerdict,
  weatherLabels,
  type SprayVerdict,
  type WeatherKind,
} from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { WeatherNow } from "@/server/queries/weather";

const icons: Record<
  WeatherKind,
  React.ComponentType<{ className?: string }>
> = {
  CERAH: Sun,
  BERAWAN: CloudSun,
  HUJAN: CloudRain,
  BADAI: Zap,
};

/**
 * Vonis penyemprotan diberi warnanya sendiri, terpisah dari warna langit.
 *
 * Cerah bisa berbarengan dengan "jangan nyemprot" — hujan sore yang diramalkan
 * tidak membatalkan matahari pagi. Memakai satu warna untuk keduanya membuat
 * kartunya terlihat membantah dirinya sendiri, dan itu pernah terjadi.
 */
const verdictTone: Record<SprayVerdict, string> = {
  AMAN: "text-emerald-700 dark:text-emerald-400",
  HATI_HATI: "text-amber-700 dark:text-amber-400",
  JANGAN: "text-destructive font-medium",
  TIDAK_TAHU: "text-muted-foreground",
};

const tones: Record<WeatherKind, string> = {
  CERAH: "text-amber-600 dark:text-amber-400",
  BERAWAN: "text-slate-500 dark:text-slate-400",
  HUJAN: "text-sky-600 dark:text-sky-400",
  BADAI: "text-rose-600 dark:text-rose-400",
};

/** Kira-kira berapa kilometer, cukup untuk memeriksa sebuah kode wilayah. */
function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dy = (a.latitude - b.latitude) * 111;
  const dx =
    (a.longitude - b.longitude) * 111 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** "Hari ini" kalau jendelanya hari ini, kalau bukan sebut harinya. */
function sprayWhen(label: string): string {
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  return label.toLowerCase() === today.toLowerCase()
    ? "Hari ini:"
    : `${label}:`;
}

/**
 * The forecast, framed as a spraying decision rather than as weather.
 *
 * Rain washes a mix off before the plant can take it up, so "hujan" on its own
 * is not the useful part — "jangan nyemprot hari ini" is.
 */
export function WeatherCard({
  weather,
  locationName,
  garden,
}: {
  weather: WeatherNow | null;
  locationName: string | null;
  /** Koordinat kebun, buat memeriksa apakah kode wilayahnya menunjuk ke situ. */
  garden: { latitude: number; longitude: number } | null;
}) {
  if (!weather) {
    return (
      <Card>
        <CardContent className="grid gap-1 py-5">
          <div className="flex items-center gap-2">
            <Cloud className="text-muted-foreground size-4" aria-hidden />
            <h2 className="text-sm font-medium">Cuaca Kebun</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Belum tahu kebunnya di kelurahan mana. Isi{" "}
            <span className="text-foreground font-medium">
              Kode Wilayah BMKG
            </span>{" "}
            di{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>
            , nanti ramalannya muncul di sini.
          </p>
        </CardContent>
      </Card>
    );
  }

  const Icon = icons[weather.kind];
  const window = weather.window;
  const verdict = window ? sprayVerdict(window) : "TIDAK_TAHU";
  const reason = window ? sprayReason(window) : "";

  // Kode wilayah yang salah ketik tetap mengembalikan ramalan — ramalan tempat
  // lain. Jaraknya dari kebun satu-satunya cara ketahuan tanpa hafal koordinat,
  // jadi disebut begitu ia mulai jauh.
  const off =
    garden && distanceKm(garden, weather.place) > 15
      ? Math.round(distanceKm(garden, weather.place))
      : null;

  return (
    <Card>
      <CardContent className="grid gap-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">Cuaca Kebun</h2>
            <p className="text-muted-foreground truncate text-xs">
              {weather.place.desa}, {weather.place.kecamatan}
              {locationName && locationName !== weather.place.desa
                ? ` · ${locationName}`
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Icon className={cn("size-7", tones[weather.kind])} aria-hidden />
            <div className="text-right">
              <p className="text-xl font-semibold tabular-nums">
                {weather.temp}°
              </p>
              <p className="text-muted-foreground text-xs">
                {weatherLabels[weather.kind]}
              </p>
            </div>
          </div>
        </div>

        {/* Vonisnya dan angkanya bersama-sama. Kartu ini pernah menulis "Cerah"
            dan "bakal keguyur" bersebelahan tanpa satu pun menyebutkan
            dasarnya, dan yang membacanya tidak punya cara membantahnya. */}
        <div className="grid gap-0.5">
          <p className={cn("text-sm", verdictTone[verdict])}>
            {window ? `${sprayWhen(window.label)} ` : ""}
            {sprayAdviceText[verdict]}
          </p>
          {reason ? (
            <p className="text-muted-foreground text-xs">{reason}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          {weather.days.map((day) => {
            const DayIcon = icons[day.kind];

            return (
              <div key={day.date} className="text-center">
                <p className="text-muted-foreground text-xs capitalize">
                  {day.label}
                </p>
                <DayIcon
                  className={cn("mx-auto my-1 size-4", tones[day.kind])}
                  aria-hidden
                />
                <p className="text-xs tabular-nums">
                  {day.maxTemp}°
                  <span className="text-muted-foreground">/{day.minTemp}°</span>
                </p>
                {/* Milimeter, bukan persen. BMKG memang tidak menerbitkan
                    peluang hujan — dan milimeter yang lebih menentukan. */}
                <p className="text-muted-foreground text-[11px] tabular-nums">
                  {day.slots === 0
                    ? "—"
                    : day.rainMm > 0
                      ? formatMm(day.rainMm)
                      : "kering"}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-muted-foreground text-[11px]">
          Dari BMKG, dihitung jam {SPRAY_HOURS.from}–{SPRAY_HOURS.to} saja —
          hujan tengah malam nggak menghalangi siapa pun nyemprot.
        </p>

        {off !== null ? (
          <p className="text-amber-700 text-[11px] dark:text-amber-400">
            Ramalannya buat tempat yang {off} km dari koordinat kebun. Cek lagi
            Kode Wilayah BMKG di{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>
            .
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
