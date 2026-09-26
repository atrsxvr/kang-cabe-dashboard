import { ArrowDownLeft, ArrowUpRight, BookOpen, HandCoins, Wallet } from "lucide-react";

import { CanWrite } from "@/components/auth/can-write";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { OpeningDialog } from "@/components/finance/opening-dialog";
import { PayoutDialog } from "@/components/finance/payout-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CASH_SOURCES,
  cashSourceLabels,
  directionOf,
  type CashDirection,
} from "@/lib/cash";
import { formatDate } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteOpening } from "@/server/actions/openings";
import { deletePayout } from "@/server/actions/payouts";
import type {
  CashReport,
  OpeningRow,
  PayoutRow,
} from "@/server/queries/cash";
import type { SeasonSummary } from "@/server/queries/seasons";
import type { MemberOption } from "@/server/queries/users";

const payoutLabels: Record<PayoutRow["type"], string> = {
  PROFIT_SHARE: "Bagi hasil",
  CAPITAL_RETURN: "Tarik modal",
};

/**
 * Uang yang ada sekarang, lintas musim.
 *
 * Tidak mengikuti musim yang dipilih di atas halaman, dan itu disebut di
 * kartunya: kas dipakai bersama seperti gudang, jadi saldo per musim adalah
 * angka yang tidak pernah ada di dompet siapa pun.
 */
export function CashPanel({
  report,
  openings,
  payouts,
  members,
  seasons,
  photoEnabled,
}: {
  report: CashReport;
  openings: OpeningRow[];
  payouts: PayoutRow[];
  members: MemberOption[];
  seasons: SeasonSummary[];
  photoEnabled: boolean;
}) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 py-5">
          <div className="grid gap-1 text-center">
            <p className="text-muted-foreground text-sm">Saldo kas sekarang</p>
            <p
              className={cn(
                "text-3xl font-semibold tabular-nums",
                report.balance < 0 && "text-destructive",
              )}
            >
              {formatRupiah(report.balance)}
            </p>
            <p className="text-muted-foreground mx-auto max-w-md text-xs">
              Semua musim, bukan cuma yang dipilih. Dihitung dari saldo awal, setoran,
              jualan yang udah lunas, belanja, dan uang yang dibayarkan ke
              anggota. Cocokkan sesekali sama uang di tangan dan rekening.
            </p>
          </div>

          {report.balance < 0 ? (
            // Minus hampir selalu berarti ada uang masuk yang belum diketik,
            // bukan kebun yang berutang. Mengatakannya lebih berguna daripada
            // membiarkan angka merah itu ditafsirkan sendiri.
            <p className="text-destructive text-center text-xs">
              Saldo minus biasanya berarti ada setoran atau jualan lunas yang
              belum dicatat.
            </p>
          ) : null}

          {report.unpricedPurchases > 0 ? (
            <p className="text-center text-xs text-amber-700 dark:text-amber-400">
              {report.unpricedPurchases} belanja bahan belum ada harganya, jadi
              belum ikut mengurangi saldo. Isi harganya di Inventaris.
            </p>
          ) : null}

          {report.beforeOpeningCount > 0 ? (
            <p className="text-muted-foreground text-center text-xs">
              {report.beforeOpeningCount} catatan bertanggal sebelum saldo awal
              nggak dihitung ulang — uangnya udah termasuk di saldo awal.
              Tetap dipakai buat porsi modal tiap orang.
            </p>
          ) : null}

          {report.receivable > 0 ? (
            <p className="text-muted-foreground text-center text-xs">
              {formatRupiah(report.receivable)} dari {report.receivableCount}{" "}
              penjualan masih ditagih — belum masuk saldo sampai dibayar.
            </p>
          ) : null}

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <SourceList direction="IN" report={report} />
            <SourceList direction="OUT" report={report} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Saldo awal</h2>
          <CanWrite area="capital">
            <OpeningDialog />
          </CanWrite>
        </div>

        {openings.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-xs">
            Uang yang udah ada di kas sebelum aplikasi dipakai — misalnya sisa
            kas musim pertama — dicatat di sini sebagai milik bersama, bukan
            setoran siapa-siapa.
          </p>
        ) : (
          openings.map((row) => (
            <Card key={row.id} className="py-3">
              <CardContent className="flex flex-wrap items-center gap-3 px-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.note ?? "Saldo awal kas"}</p>
                  <p className="text-muted-foreground text-xs">
                    Mulai dihitung {formatDate(row.countedAt)} · milik bersama
                  </p>
                </div>
                <p className="font-semibold tabular-nums">
                  {formatRupiah(row.amount)}
                </p>
                <CanWrite area="capital">
                  <div className="flex items-center gap-1">
                    <OpeningDialog opening={row} />
                    <ConfirmDelete
                      title="Hapus saldo awal ini?"
                      itemName={formatRupiah(row.amount)}
                      consequence="Saldo kas ikut berkurang sebesar ini."
                      action={deleteOpening}
                      fields={{ openingId: row.id }}
                      iconOnly
                    />
                  </div>
                </CanWrite>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Uang keluar ke anggota</h2>
        <CanWrite area="capital">
          <PayoutDialog
            members={members}
            seasons={seasons}
            photoEnabled={photoEnabled}
          />
        </CanWrite>
      </div>

      {payouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="bg-muted rounded-lg p-3">
              <HandCoins className="text-muted-foreground size-6" aria-hidden />
            </div>
            <p className="text-muted-foreground max-w-sm text-sm">
              Catat di sini tiap bagi hasil yang dibayarkan atau modal yang
              ditarik, biar saldo kas nggak kelebihan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {payouts.map((row) => (
            <Card key={row.id} className="py-3">
              <CardContent className="flex flex-wrap items-center gap-3 px-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {row.user.name}
                    <Badge variant="secondary">{payoutLabels[row.type]}</Badge>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(row.paidAt)}
                    {row.season ? ` · ${row.season.name}` : ""}
                    {row.proofUrl ? (
                      <>
                        {" · "}
                        <a
                          href={row.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          lihat bukti
                        </a>
                      </>
                    ) : null}
                  </p>
                  {row.note ? (
                    <p className="text-muted-foreground text-xs">{row.note}</p>
                  ) : null}
                </div>

                <p className="font-semibold tabular-nums">
                  {formatRupiah(row.amount)}
                </p>

                <CanWrite area="capital">
                  <div className="flex items-center gap-1">
                    <PayoutDialog
                      members={members}
                      seasons={seasons}
                      payout={row}
                      photoEnabled={photoEnabled}
                    />
                    <ConfirmDelete
                      title="Hapus catatan ini?"
                      itemName={`${row.user.name} · ${formatRupiah(row.amount)}`}
                      consequence={
                        row.type === "CAPITAL_RETURN"
                          ? "Saldo kas dan modal orangnya ikut berubah."
                          : "Saldo kas ikut berubah."
                      }
                      action={deletePayout}
                      fields={{ payoutId: row.id }}
                      iconOnly
                    />
                  </div>
                </CanWrite>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="grid gap-3 py-5">
          <div className="flex items-center gap-2">
            <BookOpen className="text-muted-foreground size-4" aria-hidden />
            <h2 className="text-sm font-medium">Buku kas</h2>
          </div>
          <p className="text-muted-foreground text-xs">
            Semua uang masuk dan keluar, yang terbaru di atas. Angka kecil di
            kanan itu saldo sesudah baris tersebut — kalau saldo nggak cocok
            sama uang di tangan, telusuri dari sini.
          </p>

          {report.ledger.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Belum ada uang masuk atau keluar yang tercatat.
            </p>
          ) : (
            <ul className="divide-y">
              {report.ledger.map((row) => (
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
        </CardContent>
      </Card>
    </div>
  );
}

function SourceList({
  direction,
  report,
}: {
  direction: CashDirection;
  report: CashReport;
}) {
  const incoming = direction === "IN";
  const sources = CASH_SOURCES.filter(
    (source) => directionOf(source) === direction,
  );

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Wallet className="size-3.5" aria-hidden />
          {incoming ? "Masuk" : "Keluar"}
        </p>
        <p
          className={cn(
            "font-semibold tabular-nums",
            incoming
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-destructive",
          )}
        >
          {formatRupiah(incoming ? report.totalIn : report.totalOut)}
        </p>
      </div>
      <ul className="grid gap-1 text-sm">
        {sources.map((source) => (
          <li
            key={source}
            className="flex items-baseline justify-between gap-2"
          >
            <span className="text-muted-foreground min-w-0 truncate">
              {cashSourceLabels[source]}
            </span>
            <span className="tabular-nums">
              {formatRupiah(report.bySource[source])}
            </span>
          </li>
        ))}
      </ul>
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
