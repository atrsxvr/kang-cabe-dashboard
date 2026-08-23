"use client";

import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { formatKg } from "@/lib/harvest";
import { isOutlier, type Spread } from "@/lib/spread";

const NORMAL_COLOR = "oklch(0.696 0.17 162.48)";
/**
 * Ungu, dan sengaja bukan kuning.
 *
 * Kuning sudah berarti Afkir di grafik hasil panen tepat di atas kartu ini, dan
 * merah berarti rugi di halaman Keuangan. Petikan yang jauh dari rata-rata bisa
 * jadi panen terbaik semusim — memberinya warna yang di tempat lain berarti
 * mutu rendah atau kerugian akan membuat orang membaca kabar baik sebagai
 * peringatan. Ungu belum dipakai untuk apa pun di aplikasi ini.
 */
const OUTLIER_COLOR = "oklch(0.606 0.25 292.717)";

export type SpreadPoint = { hst: number; date: string; good: number };

/**
 * Tiap petikan sebagai satu titik, dengan rata-rata dan lebar ayunannya.
 *
 * Sebar, bukan garis. Garis menyambungkan dua petikan yang berjarak seminggu
 * seolah ada nilai di antaranya, padahal di antaranya tidak ada panen sama
 * sekali — dan justru jarak vertikal antar titik itulah yang mau dibaca di
 * sini, bukan arah sambungannya.
 *
 * Pita menandai satu simpangan baku dari rata-rata: di situlah kira-kira dua
 * pertiga petikan sepantasnya jatuh. Titik di luar dua simpangan diberi warna
 * lain — jarang, jadi biasanya ada ceritanya.
 */
export function HarvestSpreadChart({
  points,
  spread,
}: {
  points: SpreadPoint[];
  spread: Spread;
}) {
  const upper = spread.mean + spread.sd;
  const lower = Math.max(0, spread.mean - spread.sd);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: -18, right: 8, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />

          {/* Pita ±1 simpangan baku, digambar lebih dulu supaya titiknya di atas. */}
          <ReferenceArea
            y1={lower}
            y2={upper}
            fill={NORMAL_COLOR}
            fillOpacity={0.1}
            stroke="none"
          />
          <ReferenceLine
            y={spread.mean}
            stroke={NORMAL_COLOR}
            strokeDasharray="5 4"
          />

          <XAxis
            type="number"
            dataKey="hst"
            name="HST"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            domain={["dataMin - 4", "dataMax + 4"]}
          />
          <YAxis
            type="number"
            dataKey="good"
            name="Bagus"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={44}
          />
          {/* Semua titik seukuran: besarnya tidak membawa arti apa pun di sini. */}
          <ZAxis range={[70, 70]} />

          <Tooltip
            cursor={{ className: "stroke-muted-foreground/50" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-popover)",
              fontSize: 12,
            }}
            formatter={(value, name) =>
              name === "Bagus"
                ? [formatKg(Number(value)), name]
                : [String(value), name]
            }
            labelFormatter={() => ""}
          />

          <Scatter data={points} fill={NORMAL_COLOR}>
            {points.map((point) => (
              <Cell
                key={`${point.hst}`}
                fill={
                  isOutlier(point.good, spread) ? OUTLIER_COLOR : NORMAL_COLOR
                }
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
