import type { Metadata } from "next";
import { CalendarCheck, Sprout, Wallet, Wheat } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { SummaryCard } from "@/components/common/summary-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

// Sprint 1 renders static figures. These become Prisma aggregates once the
// season-scoped modules exist.
const summary = [
  {
    title: "Umur Tanaman",
    value: "45",
    unit: "HST",
    hint: "Fase generatif awal",
    icon: Sprout,
  },
  {
    title: "Estimasi Kas",
    value: "Rp 4.250.000",
    hint: "Pemasukan dikurangi pengeluaran",
    icon: Wallet,
  },
  {
    title: "Tugas Weekend Ini",
    value: "3",
    unit: "tugas",
    hint: "Belum ada yang selesai",
    icon: CalendarCheck,
  },
  {
    title: "Total Panen Sementara",
    value: "128,5",
    unit: "kg",
    hint: "Akumulasi musim berjalan",
    icon: Wheat,
  },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Ringkasan kondisi musim tanam yang sedang berjalan."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <SummaryCard key={item.title} {...item} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Catatan Sprint 1</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Angka pada keempat kartu di atas masih statis. Grafik akumulasi
            panen dan status cuaca dari PRD belum dibangun.
          </p>
          <p>
            Season Selector di kanan atas sudah mengambil data asli dari
            database, tetapi pilihannya belum menyaring isi halaman.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
