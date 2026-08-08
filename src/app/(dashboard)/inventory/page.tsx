import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export default function InventoryPage() {
  return (
    <ComingSoon
      title="Inventaris & Alat"
      description="Monitoring stok saprodi dan kelayakan alat kerja."
      scope={[
        "Stok pupuk, obat, dan mulsa dengan indikator Aman / Critical / Habis",
        "Kelayakan alat kerja",
        "Pengajuan pembelian (restock request)",
      ]}
    />
  );
}

export const metadata: Metadata = { title: "Inventaris & Alat" };
