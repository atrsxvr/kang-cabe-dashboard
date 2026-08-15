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
| Habis Buat Bahan | data asli, dari pemakaian yang tercatat |
| Total Panen Sementara | data asli, dari petikan yang tercatat |

"Weekend" berarti Sabtu–Minggu pada pekan berjalan menurut WIB, dan yang
dihitung adalah tugas yang **belum** selesai. Tidak ada lagi angka contoh di
halaman ini.

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

**Bahan yang dipakai tugas.** Satu tugas bisa membawa daftar bahan, dari dua
jalan yang berakhir sama:

- **Dari Pustaka Racikan** — memilih racikan mengisi judul (kalau masih kosong),
  mengisi deskripsi dengan rincian takaran, dan menyalin takarannya. Volume
  tangki bisa diubah dulu sebelum diisikan.
- **Langsung dari gudang** — untuk ajir, mulsa, dan benih, yang nyata dibeli dan
  habis dipakai tapi tidak bisa ditakar per liter air.

Jumlah tiap baris bisa diedit di form, dan racikannya hanya jadi label; tidak
ada yang membaca ulang racikan untuk mencari takaran.

**Catat pemakaian.** Stok **tidak** berkurang saat tugas ditandai selesai.
Tugas digeser ke "Selesai" juga untuk merapikan papan, dan racikan yang baru
setengah diaplikasikan bukan racikan yang terpakai. Pemotongan stok adalah
langkah terpisah dan sekali jalan, jadi tugas yang selesai lewat papan, tabel,
atau form Edit sama-sama tertangani. Papan menampilkan berapa tugas selesai
yang stoknya belum dikurangi.

Takaran sebuah tugas terkunci begitu pemakaiannya tercatat — mengubahnya
setelah itu akan membuat gudang lebih atau kurang sebanyak selisihnya, tanpa
ada yang menjelaskan kenapa.

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
  langsung ke form Diagnosa maupun ke form Tugas, dengan volume tangki yang
  bisa disesuaikan dulu.
- **Kalkulator dosis:** takaran disimpan per liter, jadi mengubah volume tangki
  langsung menghasilkan angka yang benar tanpa hitung manual.
- **Masa tunggu panen** ditampilkan mencolok pada racikan pestisida.
- Bahan yang dipakai racikan adalah baris yang sama dengan stok gudang di
  modul Inventaris, jadi daftar belanja tahu racikan mana yang terdampak.
- Racikan hanya bisa memilih bahan yang memang bisa ditakar per liter. Ajir dan
  mulsa juga stok, tetapi "berapa per liter" adalah pertanyaan tanpa jawaban
  untuk keduanya.

**Belum ada:** program per-HST yang otomatis menjadwalkan tugas.

### 4.5 Inventaris & Alat — jalan

Tiga tab. Datanya berlaku lintas musim: sekarung pupuk dan sebuah cangkul
hidup lebih lama dari satu musim tanam.

**Stok Bahan.** Satu baris per bahan, **dipakai bersama Pustaka Racikan** —
NPK yang dipakai racikan Tole adalah NPK yang sama yang dicek Gotay di gudang,
bukan dua catatan terpisah.

- Status stok dihitung dari stok vs batas minimum, tidak disimpan: Aman,
  Menipis, atau Habis.
- Tombol + / − untuk pemakaian dan belanja harian. Setiap perubahan mencatat
  jumlah, alasan (belanja/pemakaian/koreksi/rusak), dan siapa yang mencatat —
  sehingga "kenapa NPK tinggal segini" bisa ditelusuri.
- Stok tidak bisa turun di bawah nol.
- Satuan mengikuti satuan racikan supaya keduanya bisa dibandingkan; tampilan
  menaikkannya ke kg atau liter saat angkanya besar.
- **Riwayat per bahan** menjawab "kenapa NPK tinggal segini": tiap pergerakan
  dengan jumlah, alasan, tanggal, pencatat, dan rupiah untuk baris belanja.
- Angka stok **tidak bisa diketik langsung** lewat form Edit. Ia hanya bergerak
  lewat + / −, pemakaian tugas yang tercatat, atau opname — masing-masing
  menulis alasannya. Stok awal saat bahan didaftarkan pun tercatat sebagai
  saldo awal.
- Pencarian dan saringan kategori di atas tabel.
- **Satuan beli** yang berbeda dari satuan pakai: daftar belanja menulis
  "beli min. 2 sak (10 kg)", bukan "5.000 gram", karena yang kedua bukan cara
  orang memesan di toko.
- **Kedaluwarsa** diingatkan sebulan sebelumnya. Satu tanggal per bahan, bukan
  per batch — gudang ini memakai harga rata-rata, bukan FIFO.
- Bahan **diarsipkan, bukan dihapus.** Riwayat stoknya menyimpan biaya yang
  sudah dibebankan ke musim lalu; menghapusnya akan mengubah laporan musim yang
  sudah ditutup.

**Opname Stok.** Hitungan fisik yang direkonsiliasi dengan angka tercatat. Ini
satu-satunya tempat angka tercatat boleh dikalahkan oleh apa yang benar-benar
ada di rak, dan karena itu pekerjaannya milik Logistik — bukan efek samping
menyelesaikan tugas. Yang dikosongkan berarti belum dihitung dan tidak diubah;
hanya baris yang benar-benar selisih yang menghasilkan catatan koreksi. Tapi
opname-nya sendiri selalu tercatat, termasuk yang semuanya cocok — kalau tidak,
justru hitungan yang paling rapi yang tidak meninggalkan bukti, dan "terakhir
kita hitung kapan" tidak terjawab.

**Harga dan nilai gudang.** Belanja mencatat total rupiah yang dibayar, dan
gudang menyimpan harga rata-rata bergerak per bahan.

- Yang diminta **total bayar**, bukan harga satuan: di toko yang diketahui
  "2 sak, Rp 320.000", bukan "Rp 32 per gram". Harga satuannya ditampilkan
  balik sebagai pemeriksaan.
- Harga **boleh dikosongkan** — berdiri di toko tanpa nota itu wajar, dan
  memaksakannya hanya akan membuat orang tidak mencatat sama sekali. Barang
  yang masuk tanpa harga dianggap datang di harga rata-rata yang berlaku,
  ditandai di halaman, dan bisa dilengkapi belakangan lewat Riwayat.
- Karena harga bisa diisi menyusul, harga rata-rata **selalu bisa dihitung
  ulang** dari riwayat pergerakan. Angka tersimpannya cuma singgahan, bukan
  sumber kebenaran kedua.

**Belanja.** Daftar yang dibawa saat ke kota, empat bagian:

- **Bahan** — otomatis dari yang menipis atau habis, menyebut berapa yang perlu
  dibeli dan racikan mana yang terdampak kalau tidak dibeli.
- **Alat perlu diganti** — otomatis dari alat yang rusak atau jumlahnya nol.
- **Alat perlu diservis** — dipisah karena membawa alat ke bengkel bukan
  membeli; menyertakan keterangan kerusakannya.
- **Tambahan** — diketik bebas untuk apa pun yang belum terdaftar: tali rafia,
  jasa servis, alat baru. Bisa dicentang dan dibersihkan setelah pulang.

Seluruh daftar bisa disalin atau dibagikan langsung ke WhatsApp dari ponsel.
Tombol **Sudah dibeli** pada bahan membuka form penambahan stok dengan jumlah
sudah terisi, sehingga belanja langsung menutup lingkarannya ke stok.

**Alat Kebun.** Daftar alat dengan jumlah, kondisi (Baik / Butuh servis /
Rusak), tanggal servis terakhir, dan catatan perawatan.

Setiap kejadian dicatat: beli baru, hilang, dipensiunkan, rusak, selesai
diservis. Yang mengurangi jumlah dipisahkan dari yang hanya mengubah kondisi —
kehilangan satu dari tiga cangkul menyisakan dua, bukan menandai seluruh
barisnya hilang. Riwayatnya menjawab "cangkul kita dulu tiga, sekarang kenapa
dua".

Beli alat dan ongkos servis mencatat rupiahnya. Alat **tidak disusutkan**:
cangkul tidak habis terpakai per gram seperti pupuk, dan menyebar biayanya ke
beberapa bulan hanya menghasilkan angka yang tidak dikenali siapa pun di tim
ini.

Alat bisa dicatat sedang dibawa siapa, dan punya jadwal servis berkala sendiri
— tangki semprot yang lewat jadwalnya masuk daftar belanja walau tidak ada yang
melaporkannya rusak.

### 4.6 Panen & Penjualan — jalan

Tiga tab: Panen, Penjualan, dan Piutang.

**Dua mutu, bukan tiga.** Yang benar-benar dilakukan di meja sortir cuma
memisahkan yang layak dari yang tidak: **Bagus** dan **Afkir**. Afkir tetap
dijual, hanya lebih murah — jadi ia mutu, bukan kerugian, dan tidak
diperlakukan sebagai barang buangan.

**Panen** dicatat per petikan, bobotnya dipisah per mutu. Totalnya dihitung,
tidak disimpan. HST tiap petikan muncul sendiri dari tanggal tanam, jadi
terlihat di umur berapa hasilnya naik atau turun.

**Penjualan tidak menempel pada satu hari panen.** Cabai menumpuk dulu sebelum
ada yang mengangkut, jadi yang dijual berasal dari tumpukan — bisa gabungan
beberapa hari, bisa sebagian saja dari satu hari. Penjualan melekat ke musim,
dan **sisa yang belum terjual dihitung**: total panen dikurangi total terjual,
per mutu.

Sisa boleh negatif, dan ditampilkan apa adanya kalau terjadi. Kedua sisi
dicatat berhari-hari terpisah dan dalam urutan bebas; penjualan yang mendahului
panennya adalah pengingat bahwa ada petikan yang belum ditulis, bukan data
rusak yang perlu ditolak.

**Satu penjualan punya baris per mutu, masing-masing dengan harganya sendiri.**
Bagus ke restoran dan afkir ke pengepul hampir selalu beda harga dan sering
terangkut bersamaan; satu harga per transaksi tidak bisa menuliskannya.

**Total transaksi dibulatkan naik ke kelipatan Rp 500**, karena tidak ada
pecahan di bawah itu yang beredar di sini — Rp 13.250 bukan angka yang
berpindah tangan, Rp 13.500 iya. Selalu naik, tidak pernah turun; selisihnya
milik penjual, dan membulatkan tagihan ke bawah berarti menyunat sedikit uang
di tiap muatan. Yang dibulatkan **totalnya**, bukan tiap baris mutu: pembeli
menyerahkan satu angka untuk seluruh muatan, jadi hanya di situ pembulatannya
nyata. Selisihnya ditampilkan apa adanya supaya barisnya tetap terlihat
menjumlah.

**Pembeli diketik bebas**, dengan saran dari nama yang pernah dipakai. Pengepul
yang itu-itu saja jadi cepat, tapi restoran yang sekali beli tidak perlu
didaftarkan dulu.

**Piutang** punya tabnya sendiri dengan jumlah tagihan yang menggantung. Tidak
semua pembeli bayar di tempat. Menandai lunas adalah tombol tersendiri, bukan
lewat form edit — menagih itu pekerjaan lain dari membetulkan apa yang dijual,
dan terjadi berminggu-minggu setelahnya.

**Belum ada:** tren harga pasar lokal dari luar, dan grafik hasil panen.

### 4.7 Keuangan & Kas — sebagian jalan

Dua sisi sekarang: uang masuk dari penjualan, uang keluar dari bahan yang
terpakai. Angka besar di atas halaman disebut **sisa setelah dikurangi bahan**,
bukan untung — upah, sewa, dan transport belum tercatat di mana pun, dan
menyebutnya laba akan melebihkan sebanyak biaya-biaya itu. Empat orang yang
membagi angka yang menyanjung diri sendiri persis kegagalan yang perlu
dihindari.

**Belanja bukan biaya; pemakaian yang biaya.** Sekarung pupuk yang dibeli
sekarang bisa habis di dua musim, jadi membebankannya ke musim yang kebetulan
berjalan saat uangnya keluar akan membuat angka kedua musim salah. Uang belanja
menempel di **nilai gudang** dulu, lalu menjadi biaya musim pada saat pemakaian
bahannya dicatat — dengan harga yang dibekukan di momen itu, sama seperti
takarannya. Harga naik bulan depan tidak menulis ulang biaya musim lalu.

Bahan yang keluar di luar sebuah tugas — dua puluh ajir mengganti yang patah —
bisa dibebankan ke musim lewat tombol − di Inventaris, dinilai pada harga
rata-rata yang berlaku.

Halaman ini menampilkan total biaya bahan musim terpilih, dipecah per kategori
dan per bahan, ditambah uang keluar untuk alat (lintas musim, karena alat
memang lintas musim). Pemakaian yang tercatat saat bahannya belum berharga
dilaporkan terpisah, bukan diam-diam dihitung Rp 0.

**Belum ada:** upah, sewa, transport, kalkulator bagi hasil empat anggota, dan
foto nota.

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

**Uang selalu rupiah bulat.** Sen tidak ada di sini, dan bilangan pecahan yang
melenceng sepersekian rupiah menghasilkan total yang tidak bisa dijelaskan ke
tiga orang lain. Satu-satunya pengecualian adalah harga rata-rata per satuan,
yang memang tarif dan bukan jumlah uang.

**Stok tidak pernah berkurang sebagai efek samping.** Setiap perubahan angka
stok punya satu tindakan yang menyebabkannya dan satu catatan yang
menjelaskannya. Tidak ada jalan pintas yang mengubah stok tanpa meninggalkan
alasan.

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
Ditambah rangkaian Playwright terhadap Postgres sungguhan di job terpisah —
untuk sambungan yang tidak bisa disentuh unit test: form yang mengirim ke
Server Action, filter musim yang bertahan saat pindah halaman, dan stok yang
benar-benar keluar lalu muncul sebagai biaya.

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

**3. Sisa modul Keuangan** — biaya di luar gudang (upah, sewa, transport),
bagi hasil berempat, dan foto nota. Selama itu belum ada, angka di halaman
Keuangan sengaja tidak disebut untung. Rinciannya di bagian 4.7.

**4. Sisa fitur per modul** — dirinci di bagian 4: grafik panen, status cuaca,
analitik antar musim, tampilan kalender, dan program nutrisi per-HST.
