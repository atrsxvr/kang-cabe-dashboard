import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export default function HealthPage() {
  return (
    <ComingSoon
      title="Kesehatan & Perawatan"
      description="SOP nutrisi, diagnosa hama/penyakit, dan riwayat perlakuan."
      scope={[
        "Database SOP nutrisi dan dosis pemupukan/pestisida",
        "Health log: unggah foto tanaman sakit, diagnosa, instruksi penanganan",
        "Treatment history per musim tanam",
      ]}
    />
  );
}

export const metadata: Metadata = { title: "Kesehatan Tanaman" };
