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

---

## 5. Status Implementasi

Aturan coding dan struktur folder ada di `CLAUDE.md`.

### Sprint 1 — selesai
- App shell: sidebar 8 menu (responsive, drawer di mobile) dan top navbar.
- Season Selector membaca daftar musim dari database secara *request-time*.
  Pilihannya belum menyaring data halaman.
- Dashboard Overview dengan 4 kartu ringkasan — **angkanya masih statis**.
- Tujuh modul lain berupa halaman placeholder "Segera hadir".
- Fondasi: skema Prisma lengkap + RLS aktif, lapisan query di `src/server/`,
  validasi environment, error/loading boundary, Vitest, dan CI GitHub Actions.

### Sprint 2 — selesai
- **Manajemen Musim Tanam:** tabel semua musim, dialog tambah musim, dan tombol
  maju tahap (PLANNING → ACTIVE → HARVESTING → COMPLETED).
- **Jadwal & Tugas:** Board/Kanban dan Tabel, dialog tambah tugas dengan
  banyak penugas, quick-update status, dan kalkulator HST otomatis.
- **Logbook Kebun:** riwayat tugas selesai, diurutkan dengan `completedAt`.
- Season Selector kini benar-benar menyaring data; pilihannya tersimpan di URL
  (`?season=`) sehingga bisa dibagikan antar anggota.

### Setelah Sprint 2

**Dashboard — dua kartu tersambung data asli.** *Umur Tanaman* dan *Tugas
Weekend Ini* dihitung dari database untuk musim yang dipilih. "Weekend"
berarti Sabtu–Minggu pada pekan berjalan menurut WIB, dan kartunya menghitung
tugas yang **belum** selesai. *Estimasi Kas* dan *Total Panen* masih angka
contoh, dan kini diberi label demikian di kartunya.

**Monitoring temuan lapangan** — bagian dari modul 4, di menu yang dilabeli
ulang **"Kesehatan & Monitoring"**:

- Siapa pun mencatat temuan: gejala, tingkat keparahan, lokasi petak, foto,
  dan HST saat ditemukan.
- Agronomis mengisi diagnosa dan perlakuan; pelapor serta pendiagnosa terekam.
- Status bertahap `REPORTED → DIAGNOSED → TREATED → RESOLVED`. Server menolak
  melewati tahap diagnosa, jadi temuan tidak bisa ditutup atas perlakuan yang
  tidak pernah ditentukan.
- Foto diunggah ke Supabase Storage lewat server, dikecilkan dulu di browser.
  Butuh `SUPABASE_SERVICE_ROLE_KEY`; tanpa itu temuan tetap bisa dicatat tanpa
  foto.

Yang **belum** dari modul 4: database SOP nutrisi dan dosis pemupukan, serta
kaitan otomatis dari perlakuan ke tugas terjadwal — keduanya sengaja ditunda.

### Belum dibangun
- **Autentikasi & RBAC.** Empat peran di bagian 2 belum punya mekanisme login
  sama sekali. Sejak Sprint 2 aplikasi sudah bisa **menulis** ke database, dan
  Server Actions adalah endpoint HTTP publik — siapa pun yang tahu URL-nya bisa
  membuat atau mengubah data. Ini prioritas utama Sprint 3.
- Kartu *Estimasi Kas* dan *Total Panen* di dashboard — menunggu modul
  Keuangan dan Panen. Grafik akumulasi panen dan status cuaca juga belum ada.
- Sunting dan hapus musim (baru bisa tambah dan maju tahap).
- Sunting tugas (baru bisa tambah, ubah status, dan hapus lewat action).
- Sisa modul 4: SOP nutrisi & dosis pemupukan.
- Modul 5–8: Inventaris, Panen, Keuangan, Settings.