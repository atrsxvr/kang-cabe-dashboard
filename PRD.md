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

> **Peran ini ditegakkan sistem.** Login lewat Google dan bersifat undangan:
> cuma email yang sudah didaftarkan Admin di Settings yang bisa masuk, dan
> anggota yang dinonaktifkan kehilangan akses pada permintaan berikutnya.
>
> **Membaca terbuka untuk semua yang sudah masuk**, termasuk angka uang dan
> setoran modal tiap orang. Ini koperasi berempat — menyembunyikan angka dari
> rekan sendiri menghilangkan guna aplikasi ini dibangun, dan aturan "porsi bagi
> hasil tidak dinormalkan" cuma berarti kalau semua bisa melihat celahnya.
> Otorisasi semata soal **menulis**; matriksnya ada di `src/lib/permissions.ts`.
>
> Admin bisa menulis di setiap wilayah, supaya pekerjaan yang tertinggal bisa
> ditutupi saat temannya tidak bisa mengisi sendiri.

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

Di bawah kartu ringkasan, halaman ini menampung hal-hal yang **mandek diam-diam
di tempat lain**:

- **Masa tunggu panen** ditaruh paling atas, di atas segalanya. Ini satu-satunya
  kesalahan yang bisa dibantu aplikasi ini yang akibatnya keluar dari kebun:
  residu pestisida pada cabai yang dimakan orang, dan tidak ada tanda apa pun
  pada tanamannya. Tanggal itu satu-satunya yang menghalangi.
- **Dikerjakan hari ini** — yang jatuh tempo hari ini dan yang sudah telat,
  lengkap dengan tombol menyelesaikannya tanpa pindah halaman.
- **Nunggu diurus** — tiga antrean yang masing-masing menunggu satu orang:
  temuan yang belum didiagnosa, pemakaian bahan yang belum dipotong dari stok,
  dan tagihan yang belum dibayar.
- **Panen layak jual 7 hari terakhir** dibanding tujuh hari sebelumnya. Bagus
  saja, sama seperti angka utama di halaman Panen; afkirnya disebut terpisah di
  baris kecil. Dua halaman yang memakai kata "panen" untuk dua bilangan berbeda
  adalah cara paling mudah membuat orang berhenti mempercayai keduanya. Kedua
  jendelanya sama-sama tujuh hari — pembanding yang panjangnya berbeda akan
  memasang panah "naik" tanpa ada yang benar-benar naik.
- **Stok cukup buat berapa kali** — tiap racikan rutin dihitung bisa diracik
  berapa kali lagi dengan stok sekarang, dibatasi bahan yang paling dulu habis.
  Ini panen dari keputusan satu baris `Material` dipakai bersama Pustaka
  Racikan dan gudang; datanya sudah lengkap sejak lama, hanya belum pernah
  dibagi.

**Kartu cuaca** mengambil ramalan dari **BMKG** — badan meteorologi negara ini
sendiri. Ramalannya diturunkan ke tingkat desa dan disetel untuk kondisi
Indonesia, bukan grid global belasan kilometer; terbukti bukan sekadar klaim,
karena dua desa berjarak lima kilometer mengembalikan angka yang berbeda.
Gratis dan tanpa kunci API, jadi tidak ada rahasia tambahan yang harus dirotasi.

Yang ditonjolkan bukan cuacanya melainkan keputusannya: hujan membilas racikan
sebelum sempat diserap, jadi yang dibaca orang adalah "aman buat nyemprot" atau
"tunda dulu". Vonisnya diberi warna sendiri, terpisah dari warna langit — cerah
pagi memang bisa berbarengan dengan hujan sore, dan satu warna untuk keduanya
pernah membuat kartunya menulis "Cerah" dan "bakal keguyur" bersebelahan.

Vonisnya diukur dalam **milimeter**, dan dihitung dari **sehari penuh** —
tidak ada penjagaan jam. Pernah dibatasi jam 6–17 atas anggapan penyemprotan
cuma terjadi siang; anggapan itu salah, aplikasi lewat pukul lima sore memang
dilakukan, dan menyaring jam-jam itu keluar berarti menyembunyikan hujan yang
paling relevan untuk penyemprotan sore.

Ambangnya milimeter: di bawah 0,5 mm air tidak mengalir di daun; di atas 2 mm
racikan yang baru disemprot ikut turun. Kasus yang memulai semuanya — gerimis
0,1 mm jam sepuluh malam yang membuat kartunya menyuruh menunda di hari kering
total — tetap terbaca "aman" tanpa perlu penjagaan jam, karena yang dulu
menjatuhkannya adalah membaca **peluang** dan bukan jumlah.

Karena sehari dihitung utuh, hujan subuh bisa membuat vonisnya berbunyi walau
paginya kering. Karena itu **jam hujannya disebut**: "Diramalkan 4,2 mm sekitar
jam 13–16". Satu vonis untuk seluruh hari tidak bisa membedakan hujan subuh dari
hujan sore, dan yang membaca lebih tahu kapan ia berencana menyemprot.

BMKG tidak menerbitkan peluang hujan, hanya jumlahnya — dan itu memang yang
lebih menentukan. Yang hilang adalah kemampuan membedakan "banyak tapi belum
pasti" dari "banyak dan hampir pasti"; keduanya kini sama-sama menahan
penyemprotan, dan itu lebih berhati-hati daripada sebaliknya.

Slotnya **tiga jam sekali** dan ramalannya bergerak maju sepanjang hari, jadi
lewat pukul lima sore hari ini sudah tidak punya jam kerja tersisa. Yang dipakai
memutuskan karena itu **jendela nyemprot terdekat**, bukan "hari ini" — bertahan
pada hari ini akan membuat kartunya bungkam setiap malam, padahal jam enam sore
pertanyaannya memang sudah bergeser ke besok.

BMKG minta **kode wilayah tingkat desa**, bukan koordinat, dan tidak punya
endpoint pencarian wilayah. Kodenya karena itu diketik di Settings. Salah ketik
tetap mengembalikan ramalan — ramalan tempat lain — jadi kartunya menampilkan
balik nama desa yang benar-benar diramalkan, dan memperingatkan kalau tempat itu
lebih dari 15 km dari koordinat kebun. Koordinat kebun tetap disimpan justru
untuk pemeriksaan itu.

Lajunya dibatasi BMKG; cache satu jam bukan penghematan melainkan syarat.

**Yang tidak bisa diperbaiki dengan sumber mana pun:** hujan siang tropis itu
konvektif — awan yang tumbuh dalam hitungan jam di satu tempat. Tidak ada model
global, gratis atau bayar, yang menebaknya beberapa hari ke depan. Kalau suatu
saat perlu pembanding, Open-Meteo bisa dipasang lagi sebagai sumber kedua: dua
sumber yang sepakat jauh lebih bisa dipercaya daripada salah satunya sendirian.

Di bawahnya ada **grafik hasil panen** musim berjalan.

### 4.2 Manajemen Musim Tanam — jalan

- Tabel seluruh musim: varietas, populasi, tanggal tanam, HST berjalan, jumlah
  tugas, status.
- Tambah dan sunting musim.
- Tombol maju tahap: `PLANNING → ACTIVE → HARVESTING → COMPLETED`.
- **Arsipkan**, bukan hapus. Menghapus musim akan menghanyutkan seluruh tugas,
  temuan, panen, dan transaksi di dalamnya; arsip menyembunyikannya tanpa
  merusak apa pun dan bisa dibatalkan.
- **Proyeksi panen (kg)** — perkiraan total cabai Bagus semusim. Boleh kosong.

Proyeksi itu **diketik, bukan dihitung**. Ia jadi penyebut modal per kilo yang
menentukan harga lantai di bagian 4.7, dan menebaknya dari kurva panen akan
membuat harga lantai bergerak sendiri tanpa ada yang memutuskan. Selama kosong,
panduan harga jualnya memilih diam.

Musim yang **diarsipkan tidak pernah jadi musim default**. Mengarsipkan adalah
cara tim ini bilang "simpan dulu"; musim yang diarsipkan kemarin pernah
mengalahkan musim yang sedang dipanen hanya karena tanggal tanamnya lebih baru,
dan seluruh aplikasi terbuka pada halaman kosong. Urutannya sekarang: yang
sedang berjalan, lalu yang sedang dipanen, lalu apa pun selain arsip — arsip
tetap kebagian giliran terakhir, karena kebun yang semua musimnya sudah
diarsipkan tetap punya riwayat untuk ditunjukkan.

**Belum ada:** laporan post-mortem sebagai satu halaman tersendiri. Perbandingan
antar musim sudah ada di Keuangan (bagian 4.7).

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

**Kalender** menampilkan sebulan penuh, buat pertanyaan yang tidak bisa dijawab
papan Kanban: minggu depan kosong, atau semuanya menumpuk di satu Sabtu?
Sengaja hanya baca — menyunting tetap lewat papan dan tabel, karena tempat
ketiga untuk mengubah tugas berarti satu jalur lagi yang harus dijaga seragam.

**Program nutrisi per-HST** membuat tugas berulang dari satu racikan rutin:
pilih racikan, rentang HST, dan jaraknya. Takarannya disalin ke tiap tugas
persis seperti dibuat manual, jadi semua yang di hilir tidak perlu tahu ia
berasal dari program. HST yang sudah punya tugas dari racikan yang sama
dilewati, jadi menjalankannya dua kali memperpanjang jadwal, bukan
menggandakannya. Dibatasi 60 tugas sekali jalan — sekali klik yang membuat
ratusan baris adalah sekali klik yang sulit dibatalkan.

### 4.4 Kesehatan & Monitoring — sebagian jalan

Tiga bagian, dalam satu menu bertab: Temuan Lapangan, Pustaka Racikan, dan
Populasi. Tabnya digambar oleh layout, bukan oleh tiap halaman, supaya tidak
hilang-muncul saat berpindah di antara ketiganya.

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

**Populasi Tanaman — jalan.** Buku catatan berapa pokok yang masih berdiri.

Mati dan sulam dicatat sebagai kejadian, dan **populasi sekarang dihitung**
dari situ: populasi tanam dikurangi yang mati, ditambah yang disulam. Kolom
"populasi sekarang" akan menghapus bagian yang justru berguna — kapan matinya
dan kenapa.

Kematian bisa **ditautkan ke temuan** yang menjelaskannya. Itulah alasan
catatan ini tinggal di modul Kesehatan dan bukan menu sendiri: penyebab pokok
mati hampir selalu sudah jadi urusan modul ini, dan agronomis yang paling
berkepentingan sudah bekerja di halaman ini.

Menyulam hanya masuk akal selagi tanaman masih kecil — sulaman yang telat tidak
akan mengejar yang lain. Setelah jendela itu lewat, pokok yang mati
meninggalkan lubang kosong sampai musim berakhir, dan justru itu yang membuat
catatannya berarti. Menyulam tidak menambah biaya: bibitnya sudah dibeli
berlebih di awal musim, jadi mencatatnya lagi akan menghitung dua kali.

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

Racikan rutin bisa dijadikan **program terjadwal** langsung dari Jadwal &
Tugas — lihat bagian 4.3.

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

**Panen real adalah Bagus saja.** Afkir sampai sekarang belum pernah terjual,
jadi menghitungnya ke dalam angka utama akan menggelembungkan sesuatu yang
tidak bisa didukung sisi uangnya. Kilonya tetap dilaporkan — kalau nanti laku
lewat skema sambal atau chilli oil, itu **bonus**, dan angkanya bergerak
sendiri karena datanya yang bicara.

Karena itu **harga jual rata-rata** juga dihitung dari Bagus saja; mencampur
afkir akan menariknya turun dengan mutu yang memang bukan target.

Tiga angka ringkasan yang tidak bisa dibaca dari total: **berapa kali petik**,
**hasil per pohon**, dan **porsi lolos sortir**.

Yang terakhir paling diagnostik, karena memisahkan dua masalah yang obatnya
berbeda sama sekali. Hasil turun tapi lolos sortir tetap → pohonnya kurang
berbuah, urusan nutrisi dan air. Hasil tetap tapi lolos sortir turun → buahnya
banyak yang gagal sortir, biasanya penyakit buah atau kelewat matang waktu
dipetik. Angka total tidak bisa membedakan keduanya.

Hasil per pohon dibagi **populasi aktual**, dan ditulis dalam gram di bawah
satu kilo — 5.000 tanaman yang menghasilkan 500 kg itu 100 g per pohon, dan
menuliskannya "0,1 kg" membuang justru angka yang mau dibaca.

**Susut** dicatat terpisah: cabai yang sudah dipetik tapi busuk atau tercecer.
Tanpa itu, sisa belum terjual dihitung dari panen dikurangi penjualan saja, dan
terus melar tiap kali ada yang membusuk.

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

**Harga yang diketik langsung ditakar.** Begitu harga Bagus diisi, satu baris di
bawahnya menyebut tier mana yang kena dan berapa jauh dari lantai minimum —
atau, kalau di bawah modal, bahwa tiap kilo yang lepas di harga itu nombok.
Patokannya dijelaskan di bagian 4.7.

Di situlah angka itu benar-benar mengubah sesuatu. Kartu di halaman Keuangan
dibaca sesudah semuanya terjadi; yang menolong adalah baris yang muncul saat
harganya masih setengah diketik di depan pengepul. Hanya untuk Bagus — afkir
belum pernah punya harga pasar, jadi menghakiminya dengan lantai yang sama tidak
ada dasarnya.

**Pembeli diketik bebas**, dengan saran dari nama yang pernah dipakai. Pengepul
yang itu-itu saja jadi cepat, tapi restoran yang sekali beli tidak perlu
didaftarkan dulu.

**Piutang** punya tabnya sendiri dengan jumlah tagihan yang menggantung. Tidak
semua pembeli bayar di tempat. Menandai lunas adalah tombol tersendiri, bukan
lewat form edit — menagih itu pekerjaan lain dari membetulkan apa yang dijual,
dan terjadi berminggu-minggu setelahnya.

**Grafik hasil panen** memakai sumbu HST, bukan tanggal: dua musim yang mulai
berbulan-bulan terpisah tetap berjajar di "hari ke-90". Sumbu tanggal hanya
bisa menceritakan musim yang sedang dilihat.

**Naik-turun hasil panen** menjawab pertanyaan yang berbeda dari grafik di
atasnya: bukan kapan hasilnya naik-turun, melainkan seberapa bisa diandalkan.
Rata-rata sendirian tidak bisa membedakan kebun yang memberi 6 kg tiap minggu
dari kebun yang memberi 15 kg sekali lalu 1 kg tiga kali — keduanya berakhir di
angka yang sama, tapi hanya yang pertama bisa dijanjikan ke pembeli.

Dua angka besar — **rata-rata** dan **naik-turunnya** — ditambah satu lencana
yang menerjemahkan keduanya jadi kalimat: "Naik-turunnya gede — 61% dari
rata-rata".

Persentase itu yang bisa dibandingkan antar musim. Kebun 5.000 pohon yang
berayun 10 kg tidak lebih goyah dari kebun 230 pohon yang berayun 3 kg, dan
angka naik-turun telanjang akan bilang sebaliknya. Ambang stabil / agak
naik-turun / naik-turunnya gede diakui sebagai konvensi, bukan hukum.

**Ditulis dengan kata yang dipakai orang.** Tiga dari empat anggota bukan orang
teknis; "simpangan baku" dan "koefisien variasi" tidak memberi tahu mereka apa
pun. Persentasenya pindah dari kotak angka ke lencana justru karena label yang
jujur untuknya butuh empat kata, dan empat kata membungkus jadi tiga baris di
layar 360px — di lencana ia muat sebagai kalimat utuh.

Hitungannya sendiri tetap **simpangan baku sampel**, dibagi n−1: petikan yang
tercatat adalah contoh dari musim yang masih berjalan, dan membaginya dengan n
memperlakukan yang belum terjadi seolah sudah diketahui — selalu ke arah yang
lebih enak dilihat.

Grafiknya sebar, bukan garis. Garis menyambungkan dua petikan berjarak seminggu
seolah ada nilai di antaranya, padahal di antaranya tidak ada panen sama sekali;
yang mau dibaca justru jarak vertikal antar titik. Pita menandai satu simpangan
baku dari rata-rata, dan titik di luar dua simpangan diberi warna sendiri —
**ungu, sengaja bukan kuning atau merah**, karena keduanya sudah berarti afkir
dan rugi di halaman lain, sementara petikan yang jauh dari rata-rata bisa jadi
panen terbaik semusim.

Kartunya menyebut batasnya sendiri: angka ini bilang seberapa besar ayunannya,
bukan petikan mana yang bermasalah. Panen cabai memang naik pelan, memuncak,
lalu turun — sebagian sebaran yang terukur adalah bentuk kurva itu, bukan
ketidakstabilan yang bisa diperbaiki. Kartu yang diam soal ini mengundang orang
mengejar sebab yang tidak ada.

Di bawah **empat petikan** kartunya menolak berbicara. Satu angka yang meleset
menggeser seluruh hitungannya, dan pembacanya tidak punya cara tahu itu terjadi.

**Belum ada:** tren harga pasar lokal dari luar.

### 4.7 Keuangan & Kas — jalan

Lima tab: Rincian, Catatan, Modal, Bagi Hasil, dan Antar Musim.

Angka besar di atas halaman disebut **sisa musim ini**, dan keterangannya
menyebut batasnya terang-terangan: seakurat apa yang benar-benar dicatat.

Di bawahnya empat angka yang biasa ada di lembar kerja petani: **HPP per kg**,
**ROI**, **margin kotor**, dan **nilai sisa stok**.

HPP dibagi kilo **dipanen**, bukan kilo terjual. Per kilo terjual ia menumpuk
seluruh ongkos musim ke bagian yang kebetulan sudah laku, dan angkanya
berubah-ubah cuma karena ada stok menunggu pembeli. Per kilo panen ia mengukur
efisiensi budidaya, dan bisa disandingkan langsung dengan harga jual rata-rata.

**Nilai sisa stok sengaja di luar sisa musim.** Bagi hasil membagi angka sisa
musim, dan tidak ada yang bisa dibagikan dari cabai yang masih di keranjang.
Hanya Bagus yang dinilai; afkir dilaporkan kilonya dan tidak diberi rupiah.
Selama masih ada upah yang belum diketik, angka itu kebesaran — dan empat orang
yang membagi angka yang menyanjung diri sendiri persis kegagalan yang perlu
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

**Pengeluaran di luar gudang** — upah, sewa, transport — dicatat manual dengan
kategori, keterangan, dan foto nota. Penjualan tidak diketik ulang di sini:
pemasukan dibaca langsung dari transaksinya, jadi tidak pernah ada dua baris
untuk satu rupiah.

**Modal** mencatat iuran yang disetor tiap anggota, dengan tanggal, catatan,
dan foto bukti transfer. Disimpan di tabelnya sendiri, **bukan** sebagai
pemasukan: uang yang ditaruh sendiri bukan uang yang didapat, dan
mencampurnya akan membuat musim terlihat untung padahal cuma balik modal.
Juga tidak dibebankan ke satu musim — iuran awal menghidupi musim pertama lalu
sisanya terus dipakai musim berikutnya. Iuran susulan boleh ditandai untuk
putaran tertentu, tapi itu sekadar label.

Tiap anggota ditampilkan dengan **porsi modalnya di samping porsi bagi
hasilnya**. Keduanya sengaja tidak pernah disamakan otomatis: menyetor lebih
banyak dan mengambil bagian lebih kecil adalah hal yang wajar disepakati empat
orang — yang tidak wajar adalah tidak ada yang menyadarinya.

**Bagi hasil** membagi sisa musim menurut porsi tiap anggota. Kalau porsinya
belum genap 100%, sisanya ditampilkan sebagai belum ada yang punya.

### Patokan harga jual

Berapa paling murah satu kilo boleh dilepas, dalam empat tingkat.

Semuanya bertumpu pada satu angka — modal per kilo — dan ada **dua** versinya,
keduanya ditampilkan berdampingan:

| | Dibagi apa | Untuk apa |
| --- | --- | --- |
| Modal/kg sekarang | kilo yang **sudah** dipetik | jujur soal hari ini, tapi berayun keras di awal musim |
| Modal/kg proyeksi | **seluruh** panen yang diharapkan | inilah yang menentukan harga |

Yang proyeksi dipakai karena begitulah modal sebenarnya tersebar: pupuk yang
ditebar bulan lalu ikut menghidupi buah yang dipetik bulan depan. Tapi
pembilangnya baru berisi biaya sampai hari ini sementara penyebutnya sudah
memasukkan panen yang belum terjadi, jadi ia akan merangkak naik sampai musim
tutup. Yang real-time berdiri di sebelahnya persis supaya selisih itu kelihatan,
bukan tersembunyi.

Tingkatnya kelipatan dari modal proyeksi — **150%**, **135%**, **120%**, lalu
garis merah di modal itu sendiri. Persentasenya markup di atas modal, bukan
margin terhadap harga jual; 150% berarti untung setengah modal, yang jatuhnya
sepertiga dari uang yang diterima. Halaman ini sudah memakai kata "margin kotor"
untuk arti yang kedua, jadi label di tabel tiernya sengaja menghindari kata itu.

Angkanya ditulis di kode, bukan disimpan sebagai pengaturan. Mengubah porsi
untung yang disepakati adalah percakapan empat orang, bukan kolom yang digeser
sendirian sore-sore.

Lantainya **dibulatkan ke atas** ke kelipatan Rp 500. Ini batas bawah:
membulatkan sebuah lantai ke bawah menaruhnya di bawah lantai itu sendiri, dan
orang yang menuruti angka di layar akan melepas di bawah yang disepakati.

**Diam kalau tidak bisa dihitung**, dan menyebut bagian mana yang hilang.
Proyeksi kosong dan biaya kosong punya penyelesaian di dua halaman berbeda.
Biaya nol khususnya berbahaya: diteruskan, seluruh tier jatuh ke Rp 0 dan musim
yang belanjanya belum diketik akan memuji penjualan seribu rupiah sekilo.
Patokan karangan lebih berbahaya daripada tidak ada patokan, karena ia dibaca
justru di saat orangnya tidak sempat meragukannya.

**Antar musim** membandingkan uang masuk dan keluar tiap musim, lalu
menambahkan dua angka yang adil dibandingkan: **sisa per kilo panen** dan
**hasil per pohon**. Musim yang berjalan lebih lama atau berpopulasi lebih
banyak otomatis mengumpulkan angka total lebih besar tanpa berarti lebih baik.

Sisa per kilo ditulis lengkap dengan **penjabarannya** — masuk dikurangi keluar,
dibagi kilo dipetik. Kartu yang cuma memajang hasil bagi memaksa angka yang
terasa janggal untuk dipercaya atau diabaikan, karena tak satu pun bilangan
pembentuknya ada di layar itu.

Di bawahnya disebut ke mana perginya kilo yang dipetik: berapa yang laku, berapa
yang susut, berapa yang masih menunggu pembeli. Yang busuk bukan terjual dan
bukan pula menunggu pembeli, dan cuma yang menunggu itu yang masih bisa
menggerakkan angka per kilonya.

Kalau baru **satu musim** yang panennya tercatat, kartunya mengatakannya
terang-terangan. Angka per kilo punya satu tugas, dan dengan satu musim tugas
itu tidak sedang berlangsung; tanpa ada yang menyebutkan itu, ia terbaca sebagai
hitungan yang tidak bisa dipertanggungjawabkan.

**Belum ada:** apa-apa lagi selain yang menunggu autentikasi.

### 4.8 Settings & Users — jalan

**Anggota** bisa ditambah, disunting, dan **dinonaktifkan — bukan dihapus.**
Nama seseorang menempel di tugas, temuan, panen, penjualan, dan tiap
pergerakan stok yang ia catat; menghapus barisnya akan ikut membawa riwayat itu
atau membuatnya tak bertuan, padahal justru itu gunanya dicatat.

Tiap anggota punya **porsi bagi hasil** dalam persen. Totalnya tidak dipaksa
100 — kalau berempat menyepakati porsi yang menyisakan celah, celah itu perlu
dibicarakan, bukan ditutupi dengan diam-diam menggelembungkan bagian semua
orang.

Total modal yang sudah disetor tiap anggota juga muncul di kartunya di sini,
supaya siapa sudah menyetor berapa terbaca di tempat yang sama dengan porsi
bagi hasilnya.

**Profil kebun** menyimpan yang berlaku menyeluruh: nama, lokasi, koordinat
untuk ramalan cuaca, dan volume tangki yang biasa dipakai.

Halaman ini adalah **satu-satunya pintu masuk** ke aplikasi: email yang
didaftarkan di sini itulah undangannya, dan yang tidak ada barisnya ditolak
Google-nya sendiri sekalipun. Karena itu dialognya menyebutkan hal itu
terang-terangan — bukan lagi peringatan bahwa perannya belum ditegakkan.

Dua penjaga melindunginya dari mengunci dirinya sendiri: Admin tidak bisa
menonaktifkan akunnya sendiri, dan Admin aktif terakhir tidak bisa dinonaktifkan
siapa pun. Keduanya akan mengunci halaman ini untuk semua orang, dan jalan
keluarnya cuma menyentuh basis data langsung.

---

## 5. Kriteria Produk

Hal-hal yang berlaku di seluruh aplikasi, bukan pada satu modul.

**Mobile-first, dipakai di lapangan.** Diakses sambil berdiri di kebun: sidebar
jadi drawer, papan Kanban dan deretan tab bisa digeser horizontal, tabel
berubah jadi kartu di layar kecil, dan form foto membuka kamera langsung.

Diverifikasi di **360px**, bukan 390 — pengecekan lama melewatkan bug nyata:
lima tab di Keuangan butuh 480px dan lari keluar layar di semua ponsel,
sementara pemeriksaan "halaman melebar" tetap hijau, karena baris flex yang
meluber di dalam induk `min-w-0` tidak pernah melebarkan dokumen.

**Tombol yang isinya cuma ikon minimal 32px.** Beberapa di antaranya duduk
bersebelahan dengan tombol yang mengarsipkan atau menghapus baris; 24px dengan
jarak dua piksel adalah salah pencet yang menunggu terjadi pada ponsel yang
dipegang satu tangan di kebun.

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
Storage · Lucide · Recharts · Vitest · Playwright · pnpm.

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

**1. Deployment.** Belum pernah dijalankan di luar localhost, sehingga belum
pernah dipakai di kebun. Branch `main` dan `production` masih di commit awal.
Langkah-langkahnya, beserta yang sudah disiapkan di repo, ada di `DEPLOY.md`.

Dua hal yang wajib dilakukan lebih dulu: **rotasi `SUPABASE_SERVICE_ROLE_KEY`**,
yang mem-bypass row-level security dan sudah beredar di `.env` lokal selama
pengembangan; dan **`BETTER_AUTH_SECRET` yang baru** untuk produksi, bukan
salinan dari yang dipakai di localhost.

**3. Tren harga pasar lokal.** Sengaja ditunda: mencatat harga pasaran dari
luar butuh masukan manual rutin, dan biasanya berhenti diisi setelah dua
minggu.

**4. Penyusutan alat.** Sengaja tidak dihitung — cangkul melayani beberapa
musim. Konsekuensinya perlu disadari: tangki semprot yang habis dalam tiga
musim tidak pernah muncul sebagai biaya di mana pun, jadi sisa musim sedikit
lebih optimis dari kenyataannya.

**5. Upah untuk diri sendiri.** Kalau berempat mengerjakan tanpa dibayar,
sebagian "sisa" yang dibagi sebenarnya upah mereka sendiri yang menyamar.
Bukan kesalahan pencatatan, tapi perlu diingat sebelum angkanya dipakai
mengambil keputusan.

**6. Harga jual afkir.** Patokan harga hanya berlaku untuk Bagus, karena afkir
belum pernah punya harga pasar yang bisa dijadikan acuan. Begitu skema sambal
atau chilli oil jalan dan afkirnya benar-benar laku beberapa kali, angkanya ada
dan tiernya bisa menyusul.

**7. Modal per kilo yang memakai perkiraan biaya sampai musim tutup.** Sekarang
pembilangnya biaya sampai hari ini, jadi harga lantai di awal musim sedikit
lebih longgar daripada yang sebenarnya. Ditunda dengan sadar: menambahkan
tebakan kedua akan menggandakan sumber kesalahannya, dan menampilkan modal
real-time di sebelahnya sudah membuat selisihnya terlihat.

---

## 8. Peta Jalan

Usulan berikutnya, diurutkan dari yang paling mahal kalau tidak ada. Bagian 7
mencatat yang **sengaja** tidak ada; yang di sini adalah yang memang belum
dikerjakan.

Satu benang merah: hampir semuanya menjawab pertanyaan dari data yang **sudah
lengkap tercatat** dan belum pernah ditanya. Itu yang membuatnya murah.

**1. Perbandingan racikan lawan hasil.** Paling berharga dan paling ambisius.
Racikan, tugas yang memakainya di HST tertentu, dan kurva panen semuanya sudah
tercatat; menyandingkannya menjawab apakah program nutrisi musim ini benar-benar
bekerja. Itu pertanyaan yang seluruh Pustaka Racikan dibangun untuk menjawabnya,
dan sampai sekarang belum pernah ditanya sekali pun.

Perlu kehati-hatian: yang muncul adalah korelasi, bukan sebab-akibat. Cuaca dan
umur tanaman bergerak bersamaan dengan jadwal racikan. Halamannya harus
menyebutkan itu, bukan menyajikan grafik yang mengundang kesimpulan yang tidak
didukungnya.

**2. Post-mortem musim — satu halaman yang bisa dicetak.** Semua bahannya sudah
ada dan tersebar di lima tab. Musim tutup adalah saat berempat duduk bersama;
sekarang saat itu menuntut membuka lima tab dan menyalin angka ke tempat lain.

**3. Kurva harga jual sepanjang musim.** Tiap transaksi sudah punya tanggal dan
harga, tapi yang ditampilkan baru rata-ratanya — satu angka untuk delapan bulan.
Grafiknya menjawab "harga terbaik ada di HST berapa", dan itu mengubah kapan
panen berikutnya dijadwalkan.

**4. Rekap per pembeli.** Nama pembeli sudah tercatat di tiap transaksi. Siapa
yang mengambil paling banyak, siapa yang bayarnya paling lama, siapa yang
harganya paling bagus — tiga pertanyaan yang datanya lengkap dan belum pernah
dijawab.

**5. Ekspor CSV.** Sederhana, dan menghapus ketakutan yang wajar bahwa data
kebun terkunci di dalam satu aplikasi buatan sendiri.
