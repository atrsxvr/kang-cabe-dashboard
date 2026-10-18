import type { Metadata } from "next";
import { connection } from "next/server";
import { Sprout } from "lucide-react";

import { CanWrite } from "@/components/auth/can-write";
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
        <CanWrite area="seasons">
          <SeasonDialog />
        </CanWrite>
      </div>

      {seasons.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Cards on a phone. Eight columns at 360px left only the name and
              the variety on screen, with Edit and Arsip at the far end of a
              scroll nothing hinted at. */}
          <div className="grid gap-3 md:hidden">
            {seasons.map((season) => (
              <Card key={season.id} className="py-4">
                <CardContent className="grid gap-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{season.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {season.variety}
                      </p>
                    </div>
                    <StatusBadge status={season.status} kind="season" />
                  </div>

                  {season.notes ? (
                    <p className="text-muted-foreground text-xs">
                      {season.notes}
                    </p>
                  ) : null}

                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground text-xs">Tanam</dt>
                      <dd className="whitespace-nowrap">
                        {formatDate(season.startDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">HST</dt>
                      <dd className="tabular-nums">
                        {season.status === "PLANNING"
                          ? "—"
                          : calculateHst(season.startDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Populasi · Tugas
                      </dt>
                      <dd className="tabular-nums">
                        {season.plantCount.toLocaleString("id-ID")} ·{" "}
                        {season._count.tasks}
                      </dd>
                    </div>
                  </dl>

                  <CanWrite area="seasons">
                    <div className="border-t pt-2">
                      <SeasonActions season={season} />
                    </div>
                  </CanWrite>
                </CardContent>
              </Card>
            ))}
          </div>

        <Card className="hidden overflow-hidden py-0 md:block">
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
                  {/* Kolomnya sendiri yang hilang, bukan isinya. Kolom kosong
                      di tabel yang bisa digeser di ponsel berarti satu kolom
                      lebar tanpa guna, dan orang akan menggesernya berkali-kali
                      mencari yang tidak ada. */}
                  <CanWrite area="seasons">
                    <TableHead className="w-48 text-right">Aksi</TableHead>
                  </CanWrite>
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
                    <CanWrite area="seasons">
                      <TableCell className="text-right">
                        <SeasonActions season={season} />
                      </TableCell>
                    </CanWrite>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        </>
      )}
    </>
  );
}

function SeasonActions({
  season,
}: {
  season: Awaited<ReturnType<typeof listSeasonRows>>[number];
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <SeasonStatusAction seasonId={season.id} status={season.status} />
      <SeasonDialog season={season} />
      {season.status !== "ARCHIVED" ? (
        <SeasonArchiveAction
          seasonId={season.id}
          name={season.name}
          taskCount={season._count.tasks}
        />
      ) : null}
    </div>
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
