import Link from "next/link";
import { PackageMinus, ReceiptText, Stethoscope } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/money";
import { withSeason } from "@/lib/season-param";
import { cn } from "@/lib/utils";

type Item = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  href: string;
  count: number;
};

/**
 * Three queues that stall quietly.
 *
 * Each one is somebody waiting on somebody else — a finding only Tole can
 * diagnose, a mix nobody deducted, a buyer nobody chased. None of them
 * announces itself on the page where the work happens, so they collect here.
 */
export function AttentionCard({
  awaitingDiagnosis,
  unrecordedUsage,
  outstanding,
  outstandingCount,
  seasonId,
}: {
  awaitingDiagnosis: number;
  unrecordedUsage: number;
  outstanding: number;
  outstandingCount: number;
  seasonId: string;
}) {
  const items: Item[] = [
    {
      icon: Stethoscope,
      label: "Temuan nunggu didiagnosa",
      detail:
        awaitingDiagnosis > 0
          ? "cuma agronomis yang bisa lanjutin"
          : "nggak ada antrean",
      href: withSeason("/health", seasonId),
      count: awaitingDiagnosis,
    },
    {
      icon: PackageMinus,
      label: "Pemakaian belum dicatat",
      detail:
        unrecordedUsage > 0
          ? "stok gudang masih kebanyakan segini"
          : "stok sudah sesuai",
      href: withSeason("/tasks", seasonId),
      count: unrecordedUsage,
    },
    {
      icon: ReceiptText,
      label: "Tagihan belum dibayar",
      detail:
        outstandingCount > 0
          ? `${formatRupiah(outstanding)} belum masuk`
          : "semua sudah lunas",
      href: withSeason("/harvest", seasonId),
      count: outstandingCount,
    },
  ];

  return (
    <Card>
      <CardContent className="grid gap-2 py-5">
        <h2 className="mb-1 text-sm font-medium">Nunggu diurus</h2>

        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="hover:bg-accent flex items-center gap-3 rounded-md border px-3 py-2"
          >
            <item.icon
              className={cn(
                "size-4 shrink-0",
                item.count > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{item.label}</p>
              <p className="text-muted-foreground text-xs">{item.detail}</p>
            </div>
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                item.count > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              {item.count}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
