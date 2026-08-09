# Product Requirement Document — Kang Cabe Dashboard

Dokumen ini menggambarkan produk **sebagaimana adanya sekarang**, beserta yang
direncanakan. Aturan coding dan struktur folder ada di `CLAUDE.md`.

---

## 1. Ringkasan

Dashboard web untuk mengelola proyek budidaya cabai rawit merah berbasis
komunitas/RT. Mendukung siklus tanam berkelanjutan (multi-musim) dan
mempermudah kolaborasi empat anggota dengan latar belakang yang berbeda —
hanya satu di antaranya berlatar teknis.

**Kebun rujukan** yang datanya dipakai membangun produk ini: 5.000 tanaman
varietas Rawit Ori 212, ditanam 10 Januari 2026, kini melewati **HST 200** dan
berada pada fase produksi dengan **panen berjalan terus-menerus**. Racikan
nutrisi dicampur dalam tangki **45 liter** untuk sekali aplikasi satu kebun.

Fakta-fakta itu membentuk banyak keputusan produk: fase produksi tidak berujung,
perlakuan berulang dalam rotasi bukan sekali jalan, dan penyemprotan pestisida
memblokir panen selama beberapa hari.

---

## 2. Pengguna & Peran

| Peran | Anggota | Tanggung jawab |
| --- | --- | --- |
| Admin / Project Manager | Atras | Jadwal, keuangan, alokasi tugas, konfigurasi |
| Agronomis / Lead Teknis | Tole | SOP nutrisi, kesehatan tanaman, diagnosa hama/penyakit |
| Logistik & Ops | Gotay | Stok saprodi, kelayakan alat, pengadaan |
| Pascapanen & Sales | Ican | Data panen, grading, tren harga, penjualan |

> **Peran ini belum ditegakkan sistem.** Belum ada autentikasi; aplikasi tidak
> bisa membedakan satu anggota dari yang lain. Pembagian di atas adalah
> kesepakatan kerja, dan menjadi dasar RBAC yang akan dibangun. Lihat bagian 6.

**Alur kerja yang disepakati:** pembuatan tugas dilakukan Admin, hasil
koordinasi dengan Agronomis. Racikan disusun Agronomis.

---

## 3. Fitur Global

**Season Selector (navbar).** Menentukan konteks musim untuk seluruh halaman.
Pilihannya tersimpan di URL (`?season=`) sehingga bisa dibagikan antar anggota
dan bertahan saat berpindah halaman. Semua data operasional disaring
berdasarkan musim yang dipilih.

**Tema terang/gelap.** Mengikuti preferensi sistem, bisa diubah manual.

---

## 4. Modul

### 4.1 Dashboard Overview — sebagian jalan

Empat kartu ringkasan untuk musim yang dipilih:

| Kartu | Status |
| --- | --- |
| Umur Tanaman (HST) | data asli |
| Tugas Weekend Ini | data asli |
| Estimasi Kas | angka contoh, menunggu modul Keuangan |
| Total Panen Sementara | angka contoh, menunggu modul Panen |

"Weekend" berarti Sabtu–Minggu pada pekan berjalan menurut WIB, dan yang
dihitung adalah tugas yang **belum** selesai. Kartu berlabel jelas mana yang
masih contoh.

**Belum ada:** grafik akumulasi panen, status cuaca.

### 4.2 Manajemen Musim Tanam — jalan

- Tabel seluruh musim: varietas, populasi, tanggal tanam, HST berjalan, jumlah
  tugas, status.
- Tambah dan sunting musim.
- Tombol maju tahap: `PLANNING → ACTIVE → HARVESTING → COMPLETED`.
- **Arsipkan**, bukan hapus. Menghapus musim akan menghanyutkan seluruh tugas,
  temuan, panen, dan transaksi di dalamnya; arsip menyembunyikannya tanpa
  merusak apa pun dan bisa dibatalkan.

**Belum ada:** laporan post-mortem, analitik komparasi antar musim (modal vs
hasil vs profit).

### 4.3 Jadwal & Tugas — jalan

- Tiga tampilan: **Board/Kanban**, **Tabel**, dan **Logbook**.
- Tambah, sunting, hapus tugas. Satu tugas bisa ditugaskan ke beberapa anggota.
- Ubah status lewat tombol cepat (`TODO → IN_PROGRESS → DONE`), bukan
  drag-and-drop — tombol bekerja dengan sentuhan, tetikus, dan keyboard tanpa
  perlakuan khusus, dan tidak bentrok dengan scroll papan di ponsel.
- Kalkulator HST otomatis; kartu menandai tugas yang lewat jatuh tempo atau
  lewat HST rencananya.
- **Logbook Kebun:** riwayat tugas selesai secara kronologis, diurutkan dengan
  waktu penyelesaian sebenarnya sehingga menyunting entri lama tidak mengacak
  urutannya.

**Belum ada:** tampilan kalender.

### 4.4 Kesehatan & Monitoring — sebagian jalan

Dua bagian, dalam satu menu bertab.

**Temuan Lapangan — jalan.** Siapa pun yang keliling kebun mencatat apa yang
dilihat; Agronomis menindaklanjuti.

- Catat temuan: gejala, tingkat keparahan, lokasi petak, foto, HST saat
  ditemukan, dan siapa yang menemukan.
- Agronomis mengisi diagnosa dan perlakuan; pendiagnosa serta waktunya terekam.
- Status bertahap `REPORTED → DIAGNOSED → TREATED → RESOLVED`. Sistem menolak
  melewati tahap diagnosa, jadi temuan tidak bisa ditutup atas perlakuan yang
  tidak pernah ditentukan.
- Foto bisa diperbesar untuk memeriksa detail daun.
- Saring daftar berdasarkan tahap.

**Pustaka Racikan — jalan.** SOP nutrisi dan dosis, berlaku lintas musim.

- Racikan **rutin** dikelompokkan per fase (Vegetatif, Generatif, Produksi),
  bisa menyebut interval pengulangan.
- Racikan **penanganan** dikaitkan ke masalah tertentu, dan bisa diisikan
  langsung ke form Diagnosa.
- **Kalkulator dosis:** takaran disimpan per liter, jadi mengubah volume tangki
  langsung menghasilkan angka yang benar tanpa hitung manual.
- **Masa tunggu panen** ditampilkan mencolok pada racikan pestisida.
- Bahan berdiri sebagai data tersendiri, siap dipakai modul Inventaris.

**Belum ada:** program per-HST yang otomatis menjadwalkan tugas, kaitan ke stok.

### 4.5 Inventaris & Alat — belum dibangun

Monitoring stok saprodi dengan indikator Aman / Critical / Habis, kelayakan
alat kerja, dan pengajuan pembelian. Model data sudah ada; bahan racikan sudah
disiapkan untuk ditempeli stok.

### 4.6 Panen & Penjualan — belum dibangun

Input hasil panen per tanggal dengan bobot dan grading A/B/C, pencatatan
transaksi penjualan, dan tren harga pasar lokal.

### 4.7 Keuangan & Kas — belum dibangun

Pemasukan dan pengeluaran dengan foto bukti, laporan laba/rugi per musim, dan
kalkulator bagi hasil empat anggota.

### 4.8 Settings & Users — belum dibangun

Manajemen akun anggota dan hak akses menu. Bergantung pada autentikasi.

---

## 5. Kriteria Produk

Hal-hal yang berlaku di seluruh aplikasi, bukan pada satu modul.

**Mobile-first, dipakai di lapangan.** Diakses sambil berdiri di kebun: sidebar
jadi drawer, papan Kanban bisa di-scroll horizontal, tabel berubah jadi kartu
di layar kecil, dan form foto membuka kamera langsung. Setiap halaman
diverifikasi tidak melebar horizontal di lebar 390px.

**Waktu selalu WIB.** Server berjalan di UTC, yang berganti hari pukul 07:00
WIB — menghitung HST di UTC akan menampilkan angka kemarin bagi orang yang
membuka aplikasi pagi hari.

**Semua data operasional terikat musim.** Tugas, temuan, panen, dan keuangan
wajib menyertakan `season_id`; aturan ini ditegakkan lint, bukan sekadar
konvensi. **Pengecualian:** Pustaka Racikan tidak terikat musim — ia
pengetahuan yang justru gunanya dipakai ulang musim berikutnya.

**Angka yang dipakai bertindak harus bisa dipercaya.** Takaran disalin, bukan
ditautkan, saat racikan dipakai — merevisi racikan tidak boleh mengubah catatan
perlakuan yang sudah terjadi. Waktu penyelesaian tugas terpisah dari waktu
penyuntingan. Data contoh diberi label sebagai contoh.

**Keselamatan hasil panen.** Masa tunggu panen setelah penyemprotan ditampilkan
mencolok. Kebun panen terus-menerus, dan pelanggarannya tidak terlihat pada
tanaman.

**Kesalahan input bisa diperbaiki sendiri.** Tiga dari empat pengguna bukan
orang teknis. Semua entitas bisa disunting; penghapusan selalu meminta
konfirmasi yang menyebutkan konsekuensinya.

**Gagal dengan jujur.** Koneksi database putus tidak mematikan navigasi;
kegagalan menampilkan pesan yang bisa ditindaklanjuti, bukan halaman kosong.

---

## 6. Batasan Teknis

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript ·
Tailwind CSS 4 · shadcn/ui · Prisma 7 · PostgreSQL (Supabase) · Supabase
Storage · Lucide · Vitest · pnpm.

Recharts disebut untuk grafik tetapi **belum dipasang** — ditambahkan saat
grafik pertama dibangun.

**Keamanan data:** Row-level security aktif di seluruh tabel, hak akses role
publik dicabut. Kunci layanan hanya dipakai di sisi server. Setiap tabel baru
wajib mengaktifkan RLS di migrasinya.

**Kualitas:** lint, typecheck, unit test, dan build berjalan di CI setiap push.

---

## 7. Yang Belum Ada

Diurutkan menurut prioritas.

**1. Autentikasi & RBAC — prioritas utama.** Belum ada login sama sekali.
Aplikasi sudah bisa menulis dan menghapus data lewat endpoint HTTP publik:
siapa pun yang tahu URL-nya bisa mengubah isi database. Peran di bagian 2 juga
tetap menjadi fiksi sampai ini ada. **Jangan deploy ke publik sebelum
autentikasi terpasang.**

**2. Deployment.** Belum pernah dijalankan di luar localhost, sehingga belum
pernah dipakai di kebun. Branch `main` dan `production` masih di commit awal.

**3. Modul Inventaris, Panen, dan Keuangan** — sekaligus melengkapi dua kartu
Dashboard yang masih berisi angka contoh.

**4. Pengujian alur di CI.** Tes yang ada mencakup logika murni; alur seperti
unggah foto dan penyaringan per musim baru diperiksa manual lewat browser.

**5. Sisa fitur per modul** — dirinci di bagian 4: grafik panen, status cuaca,
analitik antar musim, tampilan kalender, program nutrisi per-HST.
