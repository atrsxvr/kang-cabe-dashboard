import "server-only";

import {
  materialCategoryLabels,
  stockReasonLabels,
} from "@/components/inventory/inventory-labels";
import { slugify, toCsv } from "@/lib/csv";
import { gradeLabels } from "@/lib/harvest";
import { listFinanceEntries } from "@/server/queries/finance";
import { listHarvests, listSales } from "@/server/queries/harvest";
import { listAllMovements } from "@/server/queries/inventory";

/**
 * Spreadsheet exports.
 *
 * Every figure comes from the same query the page shows it from — a sale's
 * payable total is `listSales`'s rounded one, not recomputed here — so a
 * sheet and the screen can never disagree about the same transaction.
 *
 * Rows run oldest first, the way a ledger is read, even though the pages
 * list newest first.
 */

export const EXPORT_KINDS = ["penjualan", "panen", "keuangan", "stok"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const exportLabels: Record<ExportKind, string> = {
  penjualan: "Penjualan",
  panen: "Panen",
  keuangan: "Catatan keuangan",
  stok: "Riwayat stok gudang",
};

/** Whether a kind belongs to one season. The shed outlives every planting. */
export function isSeasonScoped(kind: ExportKind): boolean {
  return kind !== "stok";
}

export type ExportFile = { filename: string; csv: string };

export async function buildExport(
  kind: ExportKind,
  season: { id: string; name: string } | null
): Promise<ExportFile> {
  const stamp = new Date().toISOString().slice(0, 10);
  const scope = season ? `-${slugify(season.name)}` : "";
  const filename = `kangcabe-${kind}${scope}-${stamp}.csv`;

  if (kind === "stok") return { filename, csv: await stockCsv() };
  if (!season) throw new Error(`Ekspor ${kind} butuh musim.`);

  const csv =
    kind === "penjualan"
      ? await salesCsv(season.id)
      : kind === "panen"
        ? await harvestCsv(season.id)
        : await financeCsv(season.id);

  return { filename, csv };
}

/**
 * One row per sale line. The note-level columns — rounding, payable total,
 * paid or not — sit on a sale's first line only, so summing "Total nota" down
 * the sheet gives the real takings instead of counting a two-grade sale twice.
 */
async function salesCsv(seasonId: string): Promise<string> {
  const sales = (await listSales(seasonId)).reverse();

  const rows = sales.flatMap((sale) =>
    sale.items.map((item, index) => {
      const first = index === 0;
      return [
        sale.soldAt,
        sale.buyerName,
        gradeLabels[item.grade],
        item.weightKg,
        item.pricePerKg,
        item.total,
        first ? sale.rounding : null,
        first ? sale.totalAmount : null,
        first ? (sale.isPaid ? "Lunas" : "Belum") : null,
        first ? (sale.paidAt ?? null) : null,
        first ? (sale.recordedBy?.name ?? null) : null,
        first ? sale.notes : null,
      ];
    })
  );

  return toCsv(
    [
      "Tanggal",
      "Pembeli",
      "Mutu",
      "Bobot (kg)",
      "Harga per kg",
      "Jumlah baris",
      "Pembulatan",
      "Total nota",
      "Status bayar",
      "Tanggal lunas",
      "Dicatat oleh",
      "Catatan",
    ],
    rows
  );
}

async function harvestCsv(seasonId: string): Promise<string> {
  const harvests = (await listHarvests(seasonId)).reverse();

  return toCsv(
    [
      "Tanggal",
      `${gradeLabels.GOOD} (kg)`,
      `${gradeLabels.REJECT} (kg)`,
      "Total (kg)",
      "Dicatat oleh",
      "Catatan",
    ],
    harvests.map((row) => [
      row.harvestDate,
      row.goodKg,
      row.rejectKg,
      row.totalKg,
      row.recordedBy?.name ?? null,
      row.notes,
    ])
  );
}

/**
 * The manual entries only. Sales and material usage have sheets — or a
 * report — of their own, and folding them in here would count them twice
 * for anyone who opens both.
 */
async function financeCsv(seasonId: string): Promise<string> {
  const entries = (await listFinanceEntries(seasonId)).reverse();

  return toCsv(
    ["Tanggal", "Jenis", "Kategori", "Keterangan", "Jumlah", "Ada bukti foto"],
    entries.map((entry) => [
      entry.date,
      entry.type === "INCOME" ? "Uang masuk" : "Uang keluar",
      entry.category,
      entry.description,
      entry.amount,
      entry.proofUrl ? "Ya" : "Tidak",
    ])
  );
}

async function stockCsv(): Promise<string> {
  const movements = await listAllMovements();

  return toCsv(
    [
      "Tanggal",
      "Bahan",
      "Kategori",
      "Satuan",
      "Perubahan",
      "Alasan",
      "Nilai (Rp)",
      "Dibebankan ke musim",
      "Dicatat oleh",
      "Catatan",
    ],
    movements.map((row) => [
      row.createdAt,
      row.material.name,
      materialCategoryLabels[row.material.category] ?? row.material.category,
      row.material.unit,
      row.delta,
      stockReasonLabels[row.reason] ?? row.reason,
      row.totalCost,
      row.season?.name ?? null,
      row.actor?.name ?? null,
      row.note,
    ])
  );
}
