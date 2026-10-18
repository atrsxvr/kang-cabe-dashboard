import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Download } from "lucide-react";

import { seasonLabels } from "@/components/common/status-badge";
import { PrintButton } from "@/components/report/print-button";
import { Button } from "@/components/ui/button";
import {
  formatKgPrecise,
  formatPercent,
  formatPerPlant,
  gradeLabels,
} from "@/lib/harvest";
import { calculateHst, formatDate, formatDateTime } from "@/lib/hst";
import { formatRupiah } from "@/lib/money";
import { withSeason } from "@/lib/season-param";
import { requireActor } from "@/server/auth/guard";
import { EXPORT_KINDS, exportLabels, isSeasonScoped } from "@/server/export";
import {
  listFinanceEntries,
  profitSharing,
  seasonMaterialCost,
  seasonResult,
} from "@/server/queries/finance";
import { harvestSummary, listSales } from "@/server/queries/harvest";
import { listPayouts } from "@/server/queries/cash";
import { getSeason } from "@/server/queries/seasons";
import { getGardenProfile } from "@/server/queries/users";

export const metadata: Metadata = { title: "Laporan Musim" };

/**
 * One season on paper.
 *
 * Outside the dashboard's route group on purpose: no sidebar, no header, no
 * season picker — nothing that would print as clutter or tempt anyone to
 * switch season halfway through reading. It is the document four people sign
 * when the margin is split, so every figure comes from the same query the
 * Keuangan page uses, and the definitions behind them are printed with it.
 *
 * Always black on white, dark mode or not: it is paper, and a dark page
 * prints as a slab of toner.
 */
export default async function SeasonReportPage(
  props: PageProps<"/laporan/[seasonId]">
) {
  const { seasonId } = await props.params;

  return (
    <div className="min-h-svh bg-neutral-100 px-4 py-6 text-neutral-900 print:bg-white print:p-0">
      <Suspense
        fallback={
          <p className="mx-auto max-w-3xl text-sm text-neutral-500">
            Menyusun laporan…
          </p>
        }
      >
        <Report seasonId={seasonId} />
      </Suspense>
    </div>
  );
}

async function Report({ seasonId }: { seasonId: string }) {
  await connection();
  const actor = await requireActor();

  const season = await getSeason(seasonId);
  if (!season) notFound();

  const [garden, result, cost, harvest, sales, entries, sharing, payouts] =
    await Promise.all([
      getGardenProfile(),
      seasonResult(season.id),
      seasonMaterialCost(season.id),
      harvestSummary(season.id),
      listSales(season.id),
      listFinanceEntries(season.id),
      profitSharing(season.id),
      listPayouts(),
    ]);

  const finished = season.status === "COMPLETED" || season.status === "ARCHIVED";

  // What each member has already been handed out of this season, so the
  // sheet answers "berapa lagi" and not just "berapa haknya".
  const paidByMember = new Map<string, { name: string; amount: number }>();
  for (const payout of payouts) {
    if (payout.type !== "PROFIT_SHARE" || payout.season?.id !== season.id) {
      continue;
    }
    const current = paidByMember.get(payout.user.id);
    paidByMember.set(payout.user.id, {
      name: payout.user.name,
      amount: (current?.amount ?? 0) + payout.amount,
    });
  }

  // A member deactivated after being paid still belongs on the record of who
  // was paid; they just no longer hold a share.
  const shareRows = [
    ...sharing.rows,
    ...[...paidByMember.entries()]
      .filter(([id]) => !sharing.rows.some((row) => row.id === id))
      .map(([id, paid]) => ({ id, name: paid.name, share: 0, amount: 0 })),
  ];
  const totalPaid = [...paidByMember.values()].reduce(
    (sum, paid) => sum + paid.amount,
    0
  );

  const salesKg = sales.reduce((sum, sale) => sum + sale.totalKg, 0);
  const salesTotal = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const manualTotal = (type: "INCOME" | "EXPENSE") =>
    entries
      .filter((entry) => entry.type === type)
      .reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="outline" size="sm" className="bg-white">
          <Link href={withSeason("/finance", season.id)}>
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke Keuangan
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="grid gap-8 rounded-lg bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:p-0 print:shadow-none">
        <header className="grid gap-1 border-b border-neutral-300 pb-4">
          <p className="text-xs tracking-wide text-neutral-500 uppercase">
            {garden.name} · Laporan Musim
          </p>
          <h1 className="text-2xl font-semibold">{season.name}</h1>
          <p className="text-sm text-neutral-600">
            {season.variety} · {season.plantCount.toLocaleString("id-ID")}{" "}
            pohon · ditanam {formatDate(season.startDate)}
            {season.status !== "PLANNING"
              ? ` · HST ${calculateHst(season.startDate)}`
              : ""}{" "}
            · {seasonLabels[season.status] ?? season.status}
          </p>
          <p className="text-xs text-neutral-500">
            Dibuat {formatDateTime(new Date())} oleh {actor.name}
          </p>
          {finished ? null : (
            <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Musim ini belum ditutup, jadi semua angka di bawah masih
              sementara. Cetak ulang setelah statusnya Selesai untuk laporan
              akhir.
            </p>
          )}
        </header>

        <Section title="Ringkasan uang">
          <Table>
            <tbody>
              <Row label="Penjualan panen" value={result.salesIncome} />
              <Row label="Pemasukan lain" value={result.otherIncome} />
              <Row label="Total masuk" value={result.income} strong />
              <Row label="Biaya bahan terpakai" value={result.materialCost} />
              <Row label="Biaya lain" value={result.otherCost} />
              <Row label="Total keluar" value={result.totalCost} strong />
              <tr className="border-t-2 border-neutral-900">
                <td className="py-2 font-semibold">Sisa musim</td>
                <td
                  className={`py-2 text-right text-lg font-semibold tabular-nums ${result.margin < 0 ? "text-red-700" : ""}`}
                >
                  {formatRupiah(result.margin)}
                </td>
              </tr>
            </tbody>
          </Table>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Figure
              label="HPP per kg"
              value={result.hppPerKg !== null ? formatRupiah(result.hppPerKg) : "—"}
            />
            <Figure
              label={`Harga jual rata-rata ${gradeLabels.GOOD}`}
              value={
                harvest.averagePricePerKg > 0
                  ? `${formatRupiah(harvest.averagePricePerKg)}/kg`
                  : "—"
              }
            />
            <Figure label="ROI" value={formatPercent(result.roi, 1)} />
            <Figure
              label="Margin kotor"
              value={formatPercent(result.grossMarginRate, 1)}
            />
            <Figure
              label="Piutang belum dibayar"
              value={formatRupiah(result.outstanding)}
            />
            <Figure
              label="Nilai cabai belum laku"
              value={formatRupiah(result.unsoldValue)}
            />
          </dl>
        </Section>

        <Section title="Panen">
          <Table>
            <thead>
              <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500">
                <th className="py-1.5 font-medium">Mutu</th>
                <th className="py-1.5 text-right font-medium">Dipetik</th>
                <th className="py-1.5 text-right font-medium">Terjual</th>
                <th className="py-1.5 text-right font-medium">Susut</th>
                <th className="py-1.5 text-right font-medium">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {(["GOOD", "REJECT"] as const).map((grade) => (
                <tr key={grade} className="border-b border-neutral-200">
                  <td className="py-1.5">{gradeLabels[grade]}</td>
                  <Kg value={harvest.harvested[grade]} />
                  <Kg value={harvest.sold[grade]} />
                  <Kg value={harvest.lost[grade]} />
                  <Kg value={harvest.unsold[grade]} />
                </tr>
              ))}
            </tbody>
          </Table>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Figure label="Kali petik" value={String(harvest.sessionCount)} />
            <Figure
              label="Hasil layak per pohon"
              value={formatPerPlant(
                harvest.sellableHarvestedKg,
                harvest.actualPlantCount
              )}
            />
            <Figure
              label="Lolos sortir"
              value={formatPercent(harvest.gradeOutRate)}
            />
            <Figure
              label="Populasi akhir"
              value={`${harvest.actualPlantCount.toLocaleString("id-ID")} dari ${harvest.plantedCount.toLocaleString("id-ID")}`}
            />
            <Figure
              label="Mortalitas"
              value={`${formatPercent(harvest.mortalityRate, 1)} · ${harvest.diedCount} mati, ${harvest.replantedCount} disulam`}
            />
          </dl>
        </Section>

        <Section title="Rincian biaya">
          {result.costByCategory.length === 0 ? (
            <Empty>Belum ada biaya tercatat.</Empty>
          ) : (
            <Table>
              <tbody>
                {result.costByCategory.map((line) => (
                  <tr key={line.key} className="border-b border-neutral-200">
                    <td className="py-1.5">
                      {line.label}
                      <span className="block text-xs text-neutral-500">
                        {line.detail}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatRupiah(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {cost.byMaterial.length > 0 ? (
            <>
              <h3 className="text-sm font-medium">Bahan yang terpakai</h3>
              <Table>
                <tbody>
                  {cost.byMaterial.map((line) => (
                    <tr key={line.key} className="border-b border-neutral-200">
                      <td className="py-1.5">
                        {line.label}
                        <span className="block text-xs text-neutral-500">
                          {line.detail}
                        </span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatRupiah(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          ) : null}

          {cost.unpricedUsages > 0 ? (
            <p className="text-xs text-amber-800">
              {cost.unpricedUsages} pemakaian bahan tercatat tanpa harga dan
              dihitung Rp 0 — biaya sebenarnya lebih besar dari angka di atas.
            </p>
          ) : null}
        </Section>

        <Section title={`Penjualan (${sales.length} nota)`}>
          {sales.length === 0 ? (
            <Empty>Belum ada penjualan.</Empty>
          ) : (
            <Table>
              <thead>
                <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500">
                  <th className="py-1.5 font-medium">Tanggal</th>
                  <th className="py-1.5 font-medium">Pembeli</th>
                  <th className="py-1.5 text-right font-medium">Kg</th>
                  <th className="py-1.5 text-right font-medium">Total</th>
                  <th className="py-1.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...sales].reverse().map((sale) => (
                  <tr key={sale.id} className="border-b border-neutral-200">
                    <td className="py-1.5 whitespace-nowrap">
                      {formatDate(sale.soldAt)}
                    </td>
                    <td className="py-1.5">{sale.buyerName}</td>
                    <Kg value={sale.totalKg} />
                    <td className="py-1.5 text-right tabular-nums">
                      {formatRupiah(sale.totalAmount)}
                    </td>
                    <td
                      className={`py-1.5 text-right ${sale.isPaid ? "" : "font-medium text-amber-800"}`}
                    >
                      {sale.isPaid ? "Lunas" : "Belum"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-1.5" colSpan={2}>
                    Total
                  </td>
                  <Kg value={salesKg} />
                  <td className="py-1.5 text-right tabular-nums">
                    {formatRupiah(salesTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          )}
        </Section>

        <Section title="Catatan keuangan">
          {entries.length === 0 ? (
            <Empty>Tidak ada pemasukan atau pengeluaran yang dicatat manual.</Empty>
          ) : (
            <Table>
              <tbody>
                {[...entries].reverse().map((entry) => (
                  <tr key={entry.id} className="border-b border-neutral-200">
                    <td className="py-1.5 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="py-1.5">
                      {entry.description}
                      <span className="block text-xs text-neutral-500">
                        {entry.category}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatRupiah(
                        entry.type === "INCOME" ? entry.amount : -entry.amount
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs text-neutral-600">
                  <td className="py-1.5" colSpan={2}>
                    Masuk {formatRupiah(manualTotal("INCOME"))} · keluar{" "}
                    {formatRupiah(manualTotal("EXPENSE"))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          )}
        </Section>

        <Section title={`Bagi hasil dari ${formatRupiah(Math.max(0, sharing.margin))}`}>
          {sharing.margin <= 0 ? (
            <Empty>Musim ini belum ada sisa untuk dibagi.</Empty>
          ) : null}

          {shareRows.length > 0 && (sharing.margin > 0 || totalPaid > 0) ? (
            <Table>
              <thead>
                <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500">
                  <th className="py-1.5 font-medium">Anggota</th>
                  <th className="py-1.5 text-right font-medium">Porsi</th>
                  <th className="py-1.5 text-right font-medium">Hak</th>
                  <th className="py-1.5 text-right font-medium">Sudah dibayar</th>
                  <th className="py-1.5 text-right font-medium">Sisa</th>
                </tr>
              </thead>
              <tbody>
                {shareRows.map((row) => {
                  const paid = paidByMember.get(row.id)?.amount ?? 0;
                  return (
                    <tr key={row.id} className="border-b border-neutral-200">
                      <td className="py-1.5">{row.name}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {row.share}%
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatRupiah(row.amount)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatRupiah(paid)}
                      </td>
                      <td
                        className={`py-1.5 text-right tabular-nums ${row.amount - paid < 0 ? "text-red-700" : ""}`}
                      >
                        {formatRupiah(row.amount - paid)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}

          {/* Not normalised, here as on screen: the gap is for the members
              to settle, and printing it is how it gets settled. */}
          {sharing.totalShare !== 100 ? (
            <p className="text-xs text-amber-800">
              Porsi yang disepakati baru {sharing.totalShare}%, belum genap 100%
              {sharing.unallocated > 0
                ? ` — ${formatRupiah(sharing.unallocated)} belum ada pemiliknya`
                : ""}
              .
            </p>
          ) : null}
        </Section>

        <Section title="Disetujui oleh">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 pt-6 sm:grid-cols-4">
            {sharing.rows.map((row) => (
              <div key={row.id} className="grid gap-1 text-center text-xs">
                <div className="border-b border-neutral-400" />
                <span>{row.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <footer className="grid gap-1 border-t border-neutral-300 pt-4 text-[11px] leading-relaxed text-neutral-500">
          <p>Cara membaca angka di atas:</p>
          <ul className="list-disc pl-4">
            <li>
              Semua angka utama memakai mutu {gradeLabels.GOOD} saja. Afkir
              dilaporkan kilonya dan uangnya dihitung kalau terjual, tapi tidak
              diberi nilai selama belum laku.
            </li>
            <li>
              HPP per kg = seluruh biaya musim dibagi kilo {gradeLabels.GOOD}{" "}
              yang dipetik, bukan yang terjual.
            </li>
            <li>
              Biaya bahan dihitung saat bahannya dipakai, bukan saat dibeli.
              Belanja alat tidak dibebankan ke musim mana pun.
            </li>
            <li>
              Cabai yang belum laku dinilai tapi tidak masuk sisa musim, jadi
              belum ikut dibagi sampai terjual.
            </li>
            <li>
              Total nota penjualan sudah dibulatkan ke atas ke kelipatan Rp 500.
            </li>
          </ul>
        </footer>
      </article>

      <section className="grid gap-2 rounded-lg bg-white p-5 shadow-sm print:hidden">
        <h2 className="text-sm font-semibold">Unduh data (Excel / CSV)</h2>
        <p className="text-xs text-neutral-500">
          Untuk diolah sendiri atau disimpan sebagai cadangan. Terbuka langsung
          di Excel berbahasa Indonesia.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_KINDS.map((kind) => (
            <Button key={kind} asChild variant="outline" size="sm">
              {/* A plain anchor, not next/link: this is a file download, and
                  a client-side navigation would try to render it as a page. */}
              <a
                href={
                  isSeasonScoped(kind)
                    ? withSeason(`/api/ekspor/${kind}`, season.id)
                    : `/api/ekspor/${kind}`
                }
                download
              >
                <Download className="size-4" aria-hidden />
                {exportLabels[kind]}
                {isSeasonScoped(kind) ? "" : " (semua musim)"}
              </a>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 break-inside-avoid-page">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <tr className={strong ? "border-b border-neutral-300" : "border-b border-neutral-200"}>
      <td className={`py-1.5 ${strong ? "font-medium" : "pl-3 text-neutral-700"}`}>
        {label}
      </td>
      <td
        className={`py-1.5 text-right tabular-nums ${strong ? "font-medium" : ""}`}
      >
        {formatRupiah(value)}
      </td>
    </tr>
  );
}

function Kg({ value }: { value: number }) {
  return (
    <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
      {formatKgPrecise(value)}
    </td>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-500">{children}</p>;
}
