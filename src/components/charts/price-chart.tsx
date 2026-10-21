"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatKg } from "@/lib/harvest";
import { formatRupiah } from "@/lib/money";
import type { PricePoint } from "@/lib/price-trend";

/** Bagus's colour on the harvest chart, so the same grade reads the same. */
const GOOD_COLOR = "oklch(0.696 0.17 162.48)";
const FLOOR_COLOR = "oklch(0.645 0.246 16.439)";

// `day` is a calendar date already in Jakarta, so it is read back as UTC to
// keep it from shifting a day either way.
const shortDay = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const compact = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * Bagus's selling price per kilo, day by day, against the season's break-even
 * price when there is one.
 *
 * The axis starts at zero on purpose: cropped to the prices themselves, a
 * Rp 2.000 dip fills the whole height and reads like a collapse.
 */
export function PriceChart({
  points,
  floor,
}: {
  points: PricePoint[];
  /** The season's projected break-even price per kilo, if projected. */
  floor: number | null;
}) {
  const top = Math.max(...points.map((point) => point.high), floor ?? 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* No negative left margin, unlike the harvest chart: "40 rb" is
            wider than a kilo count and would be cut off at the edge. */}
        <LineChart data={points} margin={{ left: 0, right: 12, top: 12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(day) => shortDay.format(asDate(String(day)))}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={44}
            domain={[0, Math.ceil((top * 1.1) / 5000) * 5000]}
            tickFormatter={(value) => compact.format(Number(value))}
          />
          <Tooltip
            cursor={{ className: "stroke-muted-foreground/50" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as PricePoint | undefined;
              if (!active || !point) return null;

              return (
                <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-sm">
                  <p className="font-medium">{longDay.format(asDate(point.day))}</p>
                  <p className="tabular-nums">
                    {formatRupiah(point.price)}/kg
                    {point.low !== point.high
                      ? ` · ${formatRupiah(point.low)}–${formatRupiah(point.high)}`
                      : null}
                  </p>
                  <p className="text-muted-foreground">
                    {formatKg(point.kg)} · {point.buyers.join(", ")}
                  </p>
                </div>
              );
            }}
          />

          {floor ? (
            <ReferenceLine
              y={floor}
              stroke={FLOOR_COLOR}
              strokeDasharray="4 4"
              label={{
                value: "titik impas",
                position: "insideBottomRight",
                fontSize: 11,
                fill: FLOOR_COLOR,
              }}
            />
          ) : null}

          <Line
            type="monotone"
            dataKey="price"
            name="Harga Bagus"
            stroke={GOOD_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: GOOD_COLOR }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
