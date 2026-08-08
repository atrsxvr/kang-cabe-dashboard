import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export default function SeasonsPage() {
  return (
    <ComingSoon
      title="Manajemen Musim Tanam"
      description="Inisiasi, penutupan, dan perbandingan performa antar musim."
      scope={[
        "Inisiasi musim baru: varietas benih, tanggal tanam, jumlah populasi",
        "Penutupan musim dan laporan post-mortem",
        "Cross-season analytics: modal vs hasil vs profit",
      ]}
    />
  );
}

export const metadata: Metadata = { title: "Manajemen Musim" };
