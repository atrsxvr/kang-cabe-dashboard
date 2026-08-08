import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings & Users"
      description="Manajemen akun anggota dan hak akses menu."
      scope={[
        "Manajemen akun anggota",
        "Hak akses menu per peran (Admin, Agronomis, Logistik, Sales)",
        "Autentikasi — dijadwalkan setelah Sprint 1",
      ]}
    />
  );
}

export const metadata: Metadata = { title: "Settings & Users" };
