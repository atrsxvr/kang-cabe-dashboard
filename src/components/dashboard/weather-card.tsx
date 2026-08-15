import Link from "next/link";
import { Cloud, CloudRain, CloudSun, Sun, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { sprayAdvice, weatherLabels, type WeatherKind } from "@/lib/weather";
import { cn } from "@/lib/utils";
import type { WeatherNow } from "@/server/queries/weather";

const icons: Record<WeatherKind, React.ComponentType<{ className?: string }>> = {
  CERAH: Sun,
  BERAWAN: CloudSun,
  HUJAN: CloudRain,
  BADAI: Zap,
};

const tones: Record<WeatherKind, string> = {
  CERAH: "text-amber-600 dark:text-amber-400",
  BERAWAN: "text-slate-500 dark:text-slate-400",
  HUJAN: "text-sky-600 dark:text-sky-400",
  BADAI: "text-rose-600 dark:text-rose-400",
};

/**
 * The forecast, framed as a spraying decision rather than as weather.
 *
 * Rain washes a mix off before the plant can take it up, so "hujan" on its own
 * is not the useful part — "jangan nyemprot hari ini" is.
 */
export function WeatherCard({
  weather,
  locationName,
}: {
  weather: WeatherNow | null;
  locationName: string | null;
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
            Belum tahu kebunnya di mana. Isi lintang dan bujurnya di{" "}
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

  return (
    <Card>
      <CardContent className="grid gap-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">Cuaca Kebun</h2>
            {locationName ? (
              <p className="text-muted-foreground text-xs">{locationName}</p>
            ) : null}
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

        <p className="text-sm">
          {sprayAdvice(weather.kind, weather.rainChance)}
        </p>

        <div className="grid grid-cols-4 gap-2 border-t pt-3">
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
                  {day.maxTemp}°<span className="text-muted-foreground">/{day.minTemp}°</span>
                </p>
                <p className="text-muted-foreground text-[11px] tabular-nums">
                  {day.rainChance}% hujan
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
