import Link from "next/link";
import { Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatKg } from "@/lib/harvest";
import { formatRupiah } from "@/lib/money";
import { priceTiers, verdictFor } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { PricingGuide } from "@/server/queries/finance";

const tierTone: Record<string, string> = {
  PREMIUM:
    "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
  HEALTHY:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  MINIMUM:
    "border-orange-600/30 bg-orange-600/10 text-orange-800 dark:text-orange-300",
  FLOOR:
    "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400",
};

/**
 * Harga paling murah yang masih boleh dilepas, per tingkat.
 *
 * Dibangun dari BEP proyeksi, bukan BEP real-time. Yang real-time membagi biaya
 * dengan kilo yang sudah terpetik, jadi di awal musim ia melonjak — dan harga
 * lantai yang melonjak akan menyuruh menahan barang justru di saat harga pasar
 * bagus. Keduanya tetap dipajang bersebelahan supaya selisihnya kelihatan.
 */
export function PricingCard({
  guide,
  seasonId,
}: {
  guide: PricingGuide;
  seasonId: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 py-5">
        <div className="flex items-center gap-2">
          <Tag className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-medium">Patokan harga jual</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-md border px-3 py-2">
            <p className="text-base font-semibold tabular-nums sm:text-lg">
              {guide.realtimeBep !== null
                ? formatRupiah(guide.realtimeBep)
                : "—"}
            </p>
            <p className="text-muted-foreground text-xs">Modal/kg sekarang</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              biaya ÷ {formatKg(guide.harvestedKg)} yang sudah dipetik
            </p>
          </div>
          <div
            className={cn(
              "rounded-md border px-3 py-2",
              guide.projectedBep !== null && "border-primary/40 bg-primary/5"
            )}
          >
            <p className="text-base font-semibold tabular-nums sm:text-lg">
              {guide.projectedBep !== null
                ? formatRupiah(guide.projectedBep)
                : "—"}
            </p>
            <p className="text-muted-foreground text-xs">Modal/kg proyeksi</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {guide.projectedHarvestKg !== null
                ? `biaya ÷ ${formatKg(guide.projectedHarvestKg)} target semusim`
                : "belum ada target panen"}
            </p>
          </div>
        </div>

        {guide.projectedBep === null ? (
          <CannotPrice guide={guide} seasonId={seasonId} />
        ) : (
          <>
            <TierTable guide={guide} bep={guide.projectedBep} />

            {/* Kenapa yang proyeksi yang dipakai, dan ke mana ia bergerak.
                Tanpa ini, dua BEP berdampingan dengan selisih jutaan cuma
                menimbulkan pertanyaan yang tidak dijawab siapa pun. */}
            <p className="text-muted-foreground text-xs">
              Patokan di atas dihitung dari modal proyeksi, karena begitulah
              modal sebenarnya tersebar — pupuk bulan lalu ikut menghidupi buah
              bulan depan. Angkanya masih bakal merangkak naik selama biaya
              musim ini terus bertambah, jadi tengok lagi kalau ada belanja
              besar.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Menyebut bagian mana yang hilang, bukan sekadar "belum bisa dihitung".
 *
 * Ada dua sebab dan penyelesaiannya ada di dua halaman berbeda. Satu pesan
 * untuk keduanya akan mengirim orang mengisi target panen padahal yang kurang
 * justru catatan belanjanya.
 */
function CannotPrice({
  guide,
  seasonId,
}: {
  guide: PricingGuide;
  seasonId: string;
}) {
  const noProjection = guide.projectedHarvestKg === null;

  return (
    <div className="grid gap-3 rounded-md border border-dashed px-3 py-3">
      <p className="text-muted-foreground text-xs">
        Patokan harganya belum bisa dihitung.{" "}
        {noProjection ? (
          <>
            Isi dulu{" "}
            <span className="text-foreground font-medium">Proyeksi Panen</span>{" "}
            di musim ini — kira-kira berapa kilo cabai bagus yang kalian
            harapkan sampai musim tutup.
          </>
        ) : (
          <>
            Targetnya sudah ada, tapi{" "}
            <span className="text-foreground font-medium">
              belum ada biaya tercatat
            </span>{" "}
            di musim ini. Modal per kilo Rp 0 bakal bikin harga berapa pun
            dinyatakan bagus.
          </>
        )}{" "}
        Angka lantai yang muncul tanpa itu cuma karangan, dan itu lebih
        berbahaya daripada nggak ada patokan sama sekali.
      </p>
      <Button asChild size="sm" variant="outline" className="justify-self-start">
        <Link href={noProjection ? `/seasons?season=${seasonId}` : "/inventory"}>
          {noProjection ? "Ke Manajemen Musim" : "Ke Inventaris"}
        </Link>
      </Button>
    </div>
  );
}

function TierTable({ guide, bep }: { guide: PricingGuide; bep: number }) {
  const tiers = priceTiers(bep);
  const verdict = guide.averagePrice > 0 ? verdictFor(guide.averagePrice, bep) : null;

  return (
    <div className="grid gap-2">
      <ul className="grid gap-2">
        {tiers.map((tier) => {
          const current = verdict?.tier.key === tier.key;

          return (
            <li
              key={tier.key}
              className={cn(
                "grid gap-0.5 rounded-md border px-3 py-2",
                tierTone[tier.key],
                current && "ring-primary/40 ring-2"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {tier.label}
                  {current ? (
                    <Badge variant="secondary" className="ml-2 text-[11px]">
                      posisi kamu
                    </Badge>
                  ) : null}
                </span>
                <strong className="text-sm tabular-nums">
                  {tier.key === "FLOOR" ? "di bawah " : "≥ "}
                  {formatRupiah(tier.minPrice)}
                </strong>
              </div>
              <p className="text-xs opacity-80">{tier.strategy}</p>
            </li>
          );
        })}
      </ul>

      {verdict ? (
        <p className="text-muted-foreground text-xs">
          Harga jual rata-rata kamu{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatRupiah(guide.averagePrice)}/kg
          </span>{" "}
          — {verdict.belowCost ? "di bawah modal" : `masuk ${verdict.tier.label}`}
          {verdict.againstMinimum >= 0
            ? `, ${formatRupiah(verdict.againstMinimum)} di atas lantai minimum.`
            : `, ${formatRupiah(Math.abs(verdict.againstMinimum))} di bawah lantai minimum.`}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Belum ada penjualan Bagus yang tercatat, jadi belum ada posisi buat
          dibandingkan.
        </p>
      )}
    </div>
  );
}
