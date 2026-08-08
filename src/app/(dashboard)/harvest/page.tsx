import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export default function HarvestPage() {
  return (
    <ComingSoon
      title="Panen & Penjualan"
      description="Pencatatan hasil panen, grading, dan transaksi penjualan."
      scope={[
        "Input hasil panen per tanggal: total bobot dan grading A/B/C",
        "Pencatatan transaksi penjualan dan status pembayaran",
        "Riset tren harga pasar lokal",
      ]}
    />
  );
}

export const metadata: Metadata = { title: "Panen & Penjualan" };
