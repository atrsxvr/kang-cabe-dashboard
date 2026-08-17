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
          <h2 className="text-sm font-medium">Naik-turun hasil panen</h2>
        </div>

        {spread === null ? (
          <p className="text-muted-foreground text-sm">
            Baru {points.length} kali petik tercatat. Butuh minimal{" "}
            {MIN_SESSIONS} dulu — kalau baru sedikit, satu angka yang meleset
            bikin hitungannya ngaco dan nggak bakal ketahuan.
          </p>
        ) : (
          <>
            {/* Dua kotak, bukan tiga. Label yang jujur untuk persentasenya
                butuh empat kata, dan di layar 360px empat kata membungkus jadi
                tiga baris — jadi persentasenya pindah ke lencana di bawah, di
                mana ia bisa dijelaskan dengan kalimat utuh. */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-base font-semibold tabular-nums sm:text-lg">
                  {formatKg(spread.mean)}
                </p>
                <p className="text-muted-foreground text-xs">Rata-rata</p>
              </div>
              <div>
                <p className="text-base font-semibold tabular-nums sm:text-lg">
                  ± {formatKg(spread.sd)}
                </p>
                <p className="text-muted-foreground text-xs">Naik-turunnya</p>
              </div>
            </div>

            {stabilityOf(spread.cv) ? (
              <Badge
                variant="outline"
                className={`justify-self-start ${toneOf[stabilityOf(spread.cv) as string]}`}
              >
                {stabilityLabels[stabilityOf(spread.cv)!]} —{" "}
                {formatPercent(spread.cv)} dari rata-rata
              </Badge>
            ) : null}

            <HarvestSpreadChart points={points} spread={spread} />

            <p className="text-muted-foreground text-xs">
              Tiap titik satu kali petik. Garis putus-putus itu rata-ratanya,
              kotak hijaunya kisaran yang paling sering kejadian — dari tiga kali
              petik, biasanya dua masuk situ. Dari {spread.count} kali petik,
              paling sedikit {formatKg(spread.min)} dan paling banyak{" "}
              {formatKg(spread.max)}.
              {points.some((point) => isOutlier(point.good, spread))
                ? " Titik ungu itu yang jauh banget dari biasanya — jarang kejadian, jadi biasanya ada ceritanya. Bisa panen paling bagus, bisa juga yang anjlok."
                : ""}
            </p>

            {/* Batas yang harus disebut, bukan disembunyikan: sebagian ayunan
                ini memang bentuk kurva panen, bukan ketidakstabilan yang bisa
                diperbaiki. Kartu yang diam soal ini mengundang orang mengejar
                sebab yang tidak ada. */}
            <p className="text-muted-foreground text-xs">
              Angka ini cuma bilang seberapa besar naik-turunnya, bukan petikan
              mana yang salah. Panen cabai emang gitu — sedikit di awal, paling
              banyak di tengah, lalu turun lagi pas mau habis. Petikan pertama
              dan terakhir wajar kecil, dan itu ikut kehitung di sini.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
