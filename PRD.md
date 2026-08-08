# Product Requirement Document (PRD) - Chili Farming Dashboard

## 1. Executive Summary
Dashboard web untuk mengelola proyek budidaya cabai rawit merah berbasis komunitas/RT. Aplikasi ini dirancang untuk mendukung siklus tanam berkelanjutan (multi-season) serta mempermudah kolaborasi 4 peran anggota dengan latar belakang yang berbeda.

## 2. Target Users & Roles (RBAC)
1. **Admin / Project Manager (Frontend Dev):** Mengelola jadwal, keuangan, alokasi tugas, dan konfigurasi sistem.
2. **Agronomis / Lead Teknis (Ahli Pertanian):** Mengelola SOP nutrisi, kesehatan tanaman, dan diagnosa hama/penyakit.
3. **Logistik & Ops (Buruh Pabrik):** Mengontrol stok bahan (saprodi), kelayakan alat kerja, dan pengadaan.
4. **Pascapanen & Sales (Koki):** Mengelola data panen, grading, tren harga pasar, dan penjualan.

---

## 3. Core Features & Menu Structure

### Global Feature
- **Season Selector (Top Navbar):** Filter konteks data berdasarkan musim tanam aktif atau arsip musim terdahulu.

### Menu Modules
1. **Dashboard Overview:**
   - Summary card: Umur tanaman (HST), Estimasi Panen, Sisa Kas, Tugas Weekend Ini.
   - Status cuaca & grafik singkat akumulasi panen.

2. **Manajemen Musim Tanam (Season Management):**
   - Inisiasi musim baru (Varietas benih, tanggal tanam, jumlah populasi).
   - Penutupan musim & laporan *post-mortem*.
   - **Cross-Season Analytics:** Tabel komparasi performa antar-musim (modal vs hasil vs profit).

3. **Jadwal & Tugas (Task & Logbook):**
   - Kalender & Kanban board kegiatan (*To-Do, In Progress, Done*).
   - Jurnal Kebun (Logbook) riwayat aktivitas yang selesai.

4. **Kesehatan & Perawatan (Health & Agronomy):**
   - Database SOP Nutrisi & Dosis Pemupukan/Pestisida.
   - **Health Log:** Upload foto tanaman sakit, diagnosa, dan instruksi penanganan.
   - Riwayat perlakuan medis (*Treatment History*).

5. **Inventaris & Alat (Inventory & Tools):**
   - Monitoring stok bahan (Pupuk, Obat, Mulsa) dengan status indikator (*Aman / Critical / Habis*).
   - Kelayakan alat kerja & pengajuan pembelian (*Restock Request*).

6. **Panen & Penjualan (Harvest & Sales):**
   - Input hasil panen per tanggal, total bobot (kg), dan *grading* (Grade A, B, C).
   - Pencatatan transaksi penjualan & riset tren harga pasar lokal.

7. **Keuangan & Kas (Finance):**
   - Pencatatan Pemasukan & Pengeluaran + upload foto bukti transaksi.
   - Laporan Laba/Rugi per musim tanam & kalkulator bagi hasil 4 anggota.

8. **Settings & Users:**
   - Manajemen akun anggota dan hak akses menu.

---

## 4. Technical Constraints & Design Principles
- **Mobile-First Responsive:** Dioptimalkan untuk layar ponsel karena sering diakses di lapangan.
- **UI/UX:** Modern, clean, dark/light mode toggle.
- **Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, Lucide Icons, Recharts.
- **Data Integrity:** Semua data operasional (tugas, log, panen, keuangan) WAJIB terikat dengan `season_id`.