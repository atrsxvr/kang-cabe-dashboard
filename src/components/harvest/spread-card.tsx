import { Sigma } from "lucide-react";

import {
  HarvestSpreadChart,
  type SpreadPoint,
} from "@/components/charts/harvest-spread-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatKg, formatPercent } from "@/lib/harvest";
import {
  MIN_SESSIONS,
  isOutlier,
  spreadOf,
  stabilityLabels,
  stabilityOf,
} from "@/lib/spread";

const toneOf: Record<string, string> = {
  STABIL:
    "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  SEDANG:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  BERAYUN:
    "border-orange-600/30 bg-orange-600/10 text-orange-800 dark:text-orange-300",
};

/**
 * Seberapa rata hasil tiap petikan.
 *
 * Rata-rata sendirian tidak bisa membedakan kebun yang memberi 6 kg tiap minggu
 * dari kebun yang memberi 15 kg sekali lalu 1 kg tiga kali. Keduanya berakhir
 * di angka yang sama, tapi hanya yang pertama bisa dijanjikan ke pembeli.
 *
 * Bagus saja, seperti setiap angka hasil panen lain di aplikasi ini.
 */
export function SpreadCard({ points }: { points: SpreadPoint[] }) {
  const spread = spreadOf(points.map((point) => point.good));

  return (
    <Card>
      <CardContent className="grid gap-3 py-5">
        <div className="flex items-center gap-2">
          <Sigma className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-medium">Sebaran hasil tiap petik</h2>
        </div>

        {spread === null ? (
          <p className="text-muted-foreground text-sm">
            Baru {points.length} petikan tercatat. Butuh minimal {MIN_SESSIONS}{" "}
            buat bisa bilang apa-apa soal sebarannya — di bawah itu satu angka
            yang meleset menggeser seluruh hitungannya, dan nggak ada cara
            ketahuan.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-base font-semibold tabular-nums sm:text-lg">
                  {formatKg(spread.mean)}
                </p>
                <p className="text-muted-foreground text-xs">Rata-rata petik</p>
              </div>
              <div>
                <p className="text-base font-semibold tabular-nums sm:text-lg">
                  ± {formatKg(spread.sd)}
                </p>
                <p className="text-muted-foreground text-xs">Simpangan baku</p>
              </div>
              <div>
                <p className="text-base font-semibold tabular-nums sm:text-lg">
                  {formatPercent(spread.cv)}
                </p>
                <p className="text-muted-foreground text-xs">Koefisien variasi</p>
              </div>
            </div>

            {stabilityOf(spread.cv) ? (
              <Badge
                variant="outline"
                className={`justify-self-start ${toneOf[stabilityOf(spread.cv) as string]}`}
              >
                {stabilityLabels[stabilityOf(spread.cv)!]}
              </Badge>
            ) : null}

            <HarvestSpreadChart points={points} spread={spread} />

            <p className="text-muted-foreground text-xs">
              Garis putus-putus itu rata-rata, pitanya satu simpangan baku — di
              situ kira-kira dua per tiga petikan sepantasnya jatuh. Dari{" "}
              {spread.count} petikan, yang terkecil {formatKg(spread.min)} dan
              terbesar {formatKg(spread.max)}.
              {points.some((point) => isOutlier(point.good, spread))
                ? " Titik ungu berjarak lebih dari dua simpangan — jarang, jadi biasanya ada ceritanya. Bisa panen terbaik, bisa juga yang anjlok."
                : ""}
            </p>

            {/* Batas yang harus disebut, bukan disembunyikan: sebagian ayunan
                ini memang bentuk kurva panen, bukan ketidakstabilan yang bisa
                diperbaiki. Kartu yang diam soal ini mengundang orang mengejar
                sebab yang tidak ada. */}
            <p className="text-muted-foreground text-xs">
              Angka ini bilang seberapa besar ayunannya, bukan petikan mana yang
              bermasalah. Panen cabai memang naik pelan di awal, memuncak, lalu
              turun menjelang habis — petikan pertama dan terakhir sepantasnya
              kecil, dan itu ikut terhitung di sini.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
