"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatKg, gradeLabels } from "@/lib/harvest";

/**
 * Matched to the badges the same two grades already wear elsewhere, rather
 * than the theme's chart ramp — that ramp is greyscale here, which would make
 * the two areas indistinguishable at exactly the moment they matter.
 */
const GOOD_COLOR = "oklch(0.696 0.17 162.48)";
const REJECT_COLOR = "oklch(0.769 0.188 70.08)";

export type HarvestPoint = {
  hst: number;
  date: string;
  good: number;
  reject: number;
};

/**
 * Yield against crop age, not against the calendar.
 *
 * HST is the axis that lets one season be compared with the next: two
 * plantings started months apart still line up at "day 90". A date axis would
 * only ever describe the season you are already looking at.
 */
export function HarvestChart({ points }: { points: HarvestPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Belum ada panen buat digambar. Catat beberapa petikan dulu.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ left: -18, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="fillGood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOOD_COLOR} stopOpacity={0.7} />
              <stop offset="100%" stopColor={GOOD_COLOR} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillReject" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={REJECT_COLOR} stopOpacity={0.7} />
              <stop offset="100%" stopColor={REJECT_COLOR} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="hst"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => String(value)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={44}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-popover)",
              fontSize: 12,
            }}
            labelFormatter={(hst, payload) => {
              const point = payload?.[0]?.payload as HarvestPoint | undefined;
              return `HST ${String(hst)}${point ? ` · ${point.date}` : ""}`;
            }}
            formatter={(value, name) => [formatKg(Number(value)), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Area
            type="monotone"
            dataKey="good"
            name={gradeLabels.GOOD}
            stackId="1"
            stroke={GOOD_COLOR}
            fill="url(#fillGood)"
          />
          <Area
            type="monotone"
            dataKey="reject"
            name={gradeLabels.REJECT}
            stackId="1"
            stroke={REJECT_COLOR}
            fill="url(#fillReject)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
