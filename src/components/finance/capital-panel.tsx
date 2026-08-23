import { HandCoins } from "lucide-react";

import { ConfirmDelete } from "@/components/common/confirm-delete";
import { ContributionDialog } from "@/components/finance/contribution-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteContribution } from "@/server/actions/capital";
import type { CapitalSummary, ContributionRow } from "@/server/queries/capital";
import type { SeasonSummary } from "@/server/queries/seasons";
import type { MemberOption } from "@/server/queries/users";

export function CapitalPanel({
  summary,
  contributions,
  members,
  seasons,
  photoEnabled,
}: {
  summary: CapitalSummary;
  contributions: ContributionRow[];
  members: MemberOption[];
  seasons: SeasonSummary[];
  photoEnabled: boolean;
}) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-4 py-5">
          <div className="grid gap-1 text-center">
            <p className="text-muted-foreground text-sm">
              Total modal terkumpul
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {formatRupiah(summary.total)}
            </p>
            <p className="text-muted-foreground mx-auto max-w-md text-xs">
              Uang yang kalian taruh sendiri, dihitung terpisah dari hasil
              jualan. Modal bukan pemasukan — kalau dicampur, musimnya kelihatan
              untung padahal cuma balik modal.
            </p>
          </div>

          {summary.contributors.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Belum ada setoran tercatat.
            </p>
          ) : (
            <ul className="grid gap-2 border-t pt-4">
              {summary.contributors.map((row) => {
                // Shown side by side and never reconciled automatically:
                // putting in more and taking a smaller cut is a fine thing to
                // agree on — nobody noticing is not.
                const gap =
                  Math.round((row.capitalShare - row.profitShare) * 10) / 10;

                return (
                  <li key={row.id} className="grid gap-1 rounded-md border p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{row.name}</span>
                      <strong className="tabular-nums">
                        {formatRupiah(row.total)}
                      </strong>
                    </div>

                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${row.capitalShare}%` }}
                      />
                    </div>

                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="tabular-nums">
                        {row.capitalShare}% dari modal
                      </span>
                      <span className="tabular-nums">
                        bagi hasil {row.profitShare}%
                      </span>
                      {row.count > 0 ? (
                        <span className="tabular-nums">
                          {row.count}× setor
                          {row.lastPaidAt
                            ? ` · terakhir ${formatDate(row.lastPaidAt)}`
                            : ""}
                        </span>
                      ) : (
                        <span>belum pernah setor</span>
                      )}
                      {gap !== 0 && row.total > 0 ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border-transparent tabular-nums",
                            gap > 0
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-sky-500/12 text-sky-700 dark:text-sky-400",
                          )}
                        >
                          {gap > 0
                            ? `setor ${gap}% lebih besar`
                            : `setor ${Math.abs(gap)}% lebih kecil`}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Riwayat setoran</h2>
        <ContributionDialog
          members={members}
          seasons={seasons}
          photoEnabled={photoEnabled}
        />
      </div>

      {contributions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="bg-muted rounded-lg p-3">
              <HandCoins className="text-muted-foreground size-6" aria-hidden />
            </div>
            <p className="text-muted-foreground text-sm">
              Catat iuran awal tiap orang di sini, biar ketahuan siapa sudah
              nyetor berapa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contributions.map((row) => (
            <Card key={row.id} className="py-3">
              <CardContent className="flex flex-wrap items-center gap-3 px-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{row.user.name}</p>
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

                <div className="flex items-center gap-1">
                  <ContributionDialog
                    members={members}
                    seasons={seasons}
                    contribution={row}
                    photoEnabled={photoEnabled}
                  />
                  <ConfirmDelete
                    title="Hapus setoran ini?"
                    itemName={`${row.user.name} · ${formatRupiah(row.amount)}`}
                    consequence="Total modalnya ikut berubah."
                    action={deleteContribution}
                    fields={{ contributionId: row.id }}
                    iconOnly
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
