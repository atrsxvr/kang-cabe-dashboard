"use client";

import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";

import { NativeSelect } from "@/components/common/native-select";
import { Button } from "@/components/ui/button";
import { cashSourceLabels, type CashDirection, type LedgerRow } from "@/lib/cash";
import { formatDate } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { loadCashLedger } from "@/server/actions/cash";

const monthLabel = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The buku kas, fifty rows at a time.
 *
 * "Muat lebih banyak" rather than endless scrolling or numbered pages: the
 * books are opened to check one thing, so more arrives only when asked —
 * nothing downloads on a stray swipe over a 4G signal, rows already read
 * stay where they are, and one wide button suits a thumb. Looking for
 * something older is what the month filter is for.
 */
export function CashLedger({
  initial,
  months,
}: {
  initial: { rows: LedgerRow[]; total: number; hasMore: boolean };
  /** `YYYY-MM`, newest first. */
  months: string[];
}) {
  const [rows, setRows] = useState(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [month, setMonth] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = (offset: number, wanted: string) => {
    setFailed(false);
    startTransition(async () => {
      const page = await loadCashLedger(offset, wanted || null).catch(() => null);
      if (!page) {
        setFailed(true);
        return;
      }
      setRows((current) => (offset === 0 ? page.rows : [...current, ...page.rows]));
      setTotal(page.total);
      setHasMore(page.hasMore);
    });
  };

  return (
    <div className="grid gap-3">
      {months.length > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <NativeSelect
            aria-label="Saring bulan"
            className="w-48"
            value={month}
            disabled={pending}
            onChange={(event) => {
              setMonth(event.target.value);
              load(0, event.target.value);
            }}
          >
            <option value="">Semua bulan</option>
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel.format(new Date(`${key}-01T00:00:00Z`))}
              </option>
            ))}
          </NativeSelect>
          <p className="text-muted-foreground text-xs tabular-nums">
            {rows.length} dari {total} catatan
          </p>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          Belum ada uang masuk atau keluar yang tercatat.
        </p>
      ) : (
        <ul className={cn("divide-y", pending && "opacity-60")}>
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                "flex items-start gap-3 py-2 text-sm",
                row.beforeOpening && "opacity-60",
              )}
            >
              <DirectionIcon direction={row.direction} />
              <div className="min-w-0 flex-1">
                <p className="truncate">{row.label}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {formatDate(row.date)} · {cashSourceLabels[row.source]}
                  {row.detail ? ` · ${row.detail}` : ""}
                </p>
                {row.beforeOpening ? (
                  <p className="text-muted-foreground text-xs italic">
                    Sudah termasuk saldo awal — nggak mengubah saldo.
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "font-medium tabular-nums",
                    row.beforeOpening
                      ? "text-muted-foreground line-through"
                      : row.direction === "IN"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-destructive",
                  )}
                >
                  {row.direction === "IN" ? "+" : "−"}
                  {formatRupiah(row.amount)}
                </p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatRupiah(row.balanceAfter)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {failed ? (
        <p className="text-destructive text-center text-xs">
          Gagal memuat. Periksa sinyal, lalu coba lagi.
        </p>
      ) : null}

      {hasMore ? (
        <Button
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={() => load(rows.length, month)}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Muat lebih banyak
          <span className="text-muted-foreground text-xs tabular-nums">
            ({total - rows.length} lagi)
          </span>
        </Button>
      ) : null}
    </div>
  );
}

function DirectionIcon({ direction }: { direction: CashDirection }) {
  const Icon = direction === "IN" ? ArrowDownLeft : ArrowUpRight;

  return (
    <span
      className={cn(
        "mt-0.5 rounded-md p-1",
        direction === "IN"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
}
