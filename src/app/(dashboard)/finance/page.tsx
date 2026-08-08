import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export default function FinancePage() {
  return (
    <ComingSoon
      title="Keuangan & Kas"
      description="Arus kas, laporan laba/rugi, dan bagi hasil anggota."
      scope={[
        "Pencatatan pemasukan dan pengeluaran dengan foto bukti transaksi",
        "Laporan laba/rugi per musim tanam",
        "Kalkulator bagi hasil 4 anggota",
      ]}
    />
  );
}

export const metadata: Metadata = { title: "Keuangan & Kas" };
