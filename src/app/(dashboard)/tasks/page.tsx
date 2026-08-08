import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export default function TasksPage() {
  return (
    <ComingSoon
      title="Jadwal & Tugas"
      description="Perencanaan kegiatan kebun dan riwayat aktivitas."
      scope={[
        "Kalender dan Kanban board (To-Do, In Progress, Done)",
        "Jurnal kebun berisi riwayat aktivitas yang selesai",
        "Penugasan ke beberapa anggota sekaligus",
      ]}
    />
  );
}

export const metadata: Metadata = { title: "Jadwal & Tugas" };
