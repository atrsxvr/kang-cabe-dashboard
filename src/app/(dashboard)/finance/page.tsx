import type { Metadata } from "next";
import Link from "next/link";
import { Coins, PackageMinus, Sprout, Wrench } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { materialCategoryLabels } from "@/components/inventory/inventory-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/money";
import { readSeasonParam } from "@/lib/season-param";
import { seasonMaterialCost, toolSpend } from "@/server/queries/finance";
import type { CostLine } from "@/server/queries/finance";
import { resolveSeason } from "@/server/queries/seasons";

export const metadata: Metadata = { title: "Keuangan & Kas" };

export default async function FinancePage(props: PageProps<"/finance">) {
  const searchParams = await props.searchParams;

  // Reading searchParams already opts this page out of prerendering, so no
  // connection() is needed here.
  const season = await resolveSeason(readSeasonParam(searchParams));

  if (!season) return <NoSeason />;

  const [cost, tools] = await Promise.all([
    seasonMaterialCost(season.id),
    toolSpend(),
  ]);

  return (
    <>
      <PageHeader
        title="Keuangan & Kas"
        description={`Biaya bahan ${season.name}, dihitung dari bahan yang benar-benar kepakai`}
      />

      <Card className="mt-6">
        <CardContent className="grid gap-1 py-6 text-center">
          <p className="text-muted-foreground text-sm">
            Habis buat bahan musim ini
          </p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatRupiah(cost.total)}
          </p>
          <p className="text-muted-foreground mx-auto max-w-md text-xs">
            Belanja belum langsung jadi biaya. Uangnya nempel di nilai gudang
            dulu, baru masuk ke sini pas bahannya dipakai dan pemakaiannya
            dicatat.
          </p>
        </CardContent>
      </Card>

      {cost.unpricedUsages > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs">
          {cost.unpricedUsages} pemakaian tercatat waktu bahannya belum ada
          harga, jadi masuk hitungan sebagai Rp 0. Isi harga belanjanya di
          Inventaris supaya pemakaian berikutnya ikut kehitung.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Breakdown
          title="Per jenis bahan"
          icon={PackageMinus}
          lines={cost.byCategory.map((line) => ({
            ...line,
            label: materialCategoryLabels[line.label] ?? line.label,
          }))}
          total={cost.total}
          empty="Belum ada pemakaian yang tercatat di musim ini."
        />

        <Breakdown
          title="Per bahan"
          icon={Sprout}
          lines={cost.byMaterial}
          total={cost.total}
          empty="Belum ada pemakaian yang tercatat di musim ini."
        />
      </div>

      <Card className="mt-6">
        <CardContent className="grid gap-3 py-5">
          <div className="flex items-center gap-2">
            <Wrench className="text-muted-foreground size-4" aria-hidden />
            <h2 className="text-sm font-medium">Uang keluar buat alat</h2>
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {formatRupiah(tools.total)}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatRupiah(tools.bought)} beli alat ·{" "}
            {formatRupiah(tools.serviced)} servis. Dihitung semua musim, bukan
            per musim — cangkul kepakai terus, nggak habis kayak pupuk.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="grid gap-2 py-5">
          <div className="flex items-center gap-2">
            <Coins className="text-muted-foreground size-4" aria-hidden />
            <h2 className="text-sm font-medium">Yang belum ada di sini</h2>
          </div>
          <ul className="text-muted-foreground grid gap-1 text-sm">
            <li>Pemasukan dari penjualan panen</li>
            <li>Upah, sewa, transport, dan pengeluaran di luar gudang</li>
            <li>Laba/rugi per musim dan bagi hasil berempat</li>
            <li>Foto nota</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

function Breakdown({
  title,
  icon: Icon,
  lines,
  total,
  empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  lines: CostLine[];
  total: number;
  empty: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-3 py-5">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-medium">{title}</h2>
        </div>

        {lines.length === 0 ? (
          <p className="text-muted-foreground text-sm">{empty}</p>
        ) : (
          <ul className="grid gap-3">
            {lines.map((line) => {
              // Share of the season's spend, so the big items stand out
              // without anyone doing the division in their head.
              const share = total > 0 ? (line.amount / total) * 100 : 0;

              return (
                <li key={line.key} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{line.label}</span>
                    <span className="font-medium tabular-nums">
                      {formatRupiah(line.amount)}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {line.detail} · {Math.round(share)}%
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NoSeason() {
  return (
    <>
      <PageHeader title="Keuangan & Kas" />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted rounded-lg p-3">
            <Coins className="text-muted-foreground size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Belum ada musim tanam</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Biaya selalu dihitung per musim, jadi buat musimnya dulu.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/seasons">Ke Manajemen Musim</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
