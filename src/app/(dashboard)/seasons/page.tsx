import type { Metadata } from "next";
import { connection } from "next/server";
import { Sprout } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SeasonArchiveAction } from "@/components/seasons/season-archive-action";
import { SeasonDialog } from "@/components/seasons/season-dialog";
import { SeasonStatusAction } from "@/components/seasons/season-status-action";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateHst, formatDate } from "@/lib/hst";
import { listSeasonRows } from "@/server/queries/seasons";

export const metadata: Metadata = { title: "Manajemen Musim" };

export default async function SeasonsPage() {
  await connection();

  const seasons = await listSeasonRows();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Manajemen Musim Tanam"
          description="Semua siklus tanam, dari perencanaan sampai arsip."
        />
        <SeasonDialog />
      </div>

      {seasons.length === 0 ? (
        <EmptyState />
      ) : (
        <Card className="overflow-hidden py-0">
          {/* The table is wider than a phone; let it scroll rather than
              squeezing columns into illegibility. */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-44">Musim</TableHead>
                  <TableHead>Varietas</TableHead>
                  <TableHead className="text-right">Populasi</TableHead>
                  <TableHead>Tanggal Tanam</TableHead>
                  <TableHead className="text-right">HST</TableHead>
                  <TableHead className="text-right">Tugas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">
                      {season.name}
                      {season.notes ? (
                        <span className="text-muted-foreground block text-xs font-normal">
                          {season.notes}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{season.variety}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {season.plantCount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(season.startDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {season.status === "PLANNING"
                        ? "—"
                        : calculateHst(season.startDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {season._count.tasks}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={season.status} kind="season" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <SeasonStatusAction
                          seasonId={season.id}
                          status={season.status}
                        />
                        <SeasonDialog season={season} />
                        {season.status !== "ARCHIVED" ? (
                          <SeasonArchiveAction
                            seasonId={season.id}
                            name={season.name}
                            taskCount={season._count.tasks}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="bg-muted rounded-lg p-3">
          <Sprout className="text-muted-foreground size-6" aria-hidden />
        </div>
        <div>
          <p className="font-medium">Belum ada musim tanam</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Buat musim pertama untuk mulai mencatat tugas, panen, dan keuangan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
