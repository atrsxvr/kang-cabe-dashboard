"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatRupiah } from "@/lib/money";

const INCOME_COLOR = "oklch(0.696 0.17 162.48)";
const COST_COLOR = "oklch(0.637 0.237 25.331)";

export type SeasonBar = {
  name: string;
  income: number;
  cost: number;
  margin: number;
};

/**
 * Money in against money out, one pair of bars per season.
 *
 * The comparison only means anything once a season has closed, so the label
 * carries the status rather than pretending a planting still running is
 * finished business.
 */
export function SeasonCompareChart({ seasons }: { seasons: SeasonBar[] }) {
  if (seasons.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Belum ada musim yang punya angka buat dibandingkan.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={seasons} margin={{ left: -8, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            width={64}
            tickFormatter={(value) => {
              const amount = Number(value);
              return amount >= 1_000_000
                ? `${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
                : `${(amount / 1000).toLocaleString("id-ID")} rb`;
            }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-popover)",
              fontSize: 12,
            }}
            formatter={(value, name) => [formatRupiah(Number(value)), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Bar dataKey="income" name="Masuk" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cost" name="Keluar" fill={COST_COLOR} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
