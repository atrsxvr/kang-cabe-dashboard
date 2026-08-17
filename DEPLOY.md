# Deployment ke Vercel

Ditulis setelah memeriksa keadaan repo ini, bukan sebagai daftar umum. Yang
sudah beres tidak diulang di sini; yang tersisa ada di bawah.

---

## Yang harus dilakukan sebelum deploy pertama

### 1. Gabungkan ke `main`

`main` dan `production` masih di commit awal (`e7b1510`). Seluruh aplikasi ada
di `development`. Vercel yang menunjuk `main` akan men-deploy kerangka kosong.

```bash
git checkout main && git merge development && git push
```

### 2. Rotasi `SUPABASE_SERVICE_ROLE_KEY`

Kunci ini mem-bypass row-level security dan sudah pernah ada di `.env` lokal
selama pengembangan. Sebelum ia dipasang di layanan yang terbuka ke internet,
terbitkan yang baru di Supabase dan cabut yang lama.

### 3. Variabel lingkungan di Vercel

| Variabel | Nilai | Catatan |
| --- | --- | --- |
| `DATABASE_URL` | pooler **6543**, `?pgbouncer=true` | wajib. Transaction pooler — satu-satunya yang aman untuk serverless |
| `DIRECT_URL` | pooler **5432** | untuk `migrate deploy`; DDL tidak jalan di 6543 |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | **yang baru**, bukan salinan dari `.env` lokal |
| `BETTER_AUTH_URL` | `https://<domain>` | **harus https** — flag `Secure` pada cookie sesi ditentukan dari ini, dan `parseEnv` menolak boot kalau bukan. Harus sama persis dengan yang didaftarkan di Google |
| `GOOGLE_CLIENT_ID` | dari Google Console | |
| `GOOGLE_CLIENT_SECRET` | dari Google Console | |
| `SUPABASE_SERVICE_ROLE_KEY` | kunci **hasil rotasi** | opsional — tanpa ini foto temuan mati, sisanya jalan |

`parseEnv` menolak boot di produksi kalau tiga variabel otentikasi kosong. Itu
disengaja: aplikasi yang menyala tanpa otentikasi adalah aplikasi yang seluruh
endpoint tulisnya terbuka, dan kegagalan itu tidak bersuara.

### 4. Redirect URI produksi di Google Console

Tambahkan `https://<domain>/api/auth/callback/google` ke Authorized redirect
URIs. Yang localhost jangan dihapus — masih dipakai mengembangkan.

Selama consent screen masih **Testing**, hanya Gmail yang terdaftar sebagai
Test users yang bisa masuk. Itu lapis kedua di atas daftar anggota, dan berarti
tiap orang baru didaftarkan di **dua** tempat.

### 5. Jalankan migrasi

**Jangan** menaruh `prisma migrate deploy` di build command Vercel: build juga
berjalan pada setiap preview deploy, dan preview akan memigrasi basis data
produksi.

```bash
DIRECT_URL="<pooler 5432 produksi>" pnpm db:deploy
```

### 6. Jangan jalankan `db:seed` di produksi

Seed membuat empat anggota dengan email placeholder (`admin@kangcabe.id` dan
seterusnya). Di basis data yang sudah berisi email Gmail sungguhan, ia akan
menambah empat baris tambahan yang tidak bisa dipakai masuk dan mengacaukan
daftar anggota.

---

## Yang sudah disiapkan di repo

**Region `hnd1` di `vercel.json`.** Basis datanya di Supabase
`ap-northeast-1` (Tokyo). Region bawaan Vercel `iad1` (Amerika) berarti setiap
query menyeberangi Pasifik — dan halaman Keuangan menjalankan sebelas query
dalam satu render. Selisihnya bukan puluhan milidetik, tapi detik. Ini
satu-satunya setelan infrastruktur yang benar-benar mengubah rasa aplikasinya.

**`postinstall: prisma generate`.** Klien Prisma masuk `.gitignore`, jadi ia
dibangun saat install di Vercel. Tanpa ini build gagal dengan modul tak
ditemukan.

**Transaction pooler.** `DATABASE_URL` sudah menunjuk 6543 dengan
`?pgbouncer=true`. Di serverless setiap invocation bisa membuka koneksi baru,
dan koneksi langsung ke Postgres akan habis kuotanya.

**`proxy.ts` tanpa akses basis data.** Ia sengaja cuma membaca ada-tidaknya
cookie — di Vercel berkas ini bisa ditempatkan di edge, jauh dari basis data.
Yang benar-benar menjaga ada di Server Action dan layout, yang berjalan di Node.

---

## Yang perlu disadari, bukan dikerjakan

**`experimental.authInterrupts` masih eksperimental.** Ia wajib untuk
`unauthorized()` dan `forbidden()`. Berfungsi, tapi namanya eksperimental
berarti bisa berubah di rilis Next berikutnya — dan yang akan rusak adalah
halaman 401 dan 403, bukan penjagaannya.

**Notifikasi otomatis butuh penjadwal.** Vercel Cron bisa memicu endpoint, tapi
sesi WhatsApp tidak resmi tidak bisa hidup di serverless. Lihat bagian 8 PRD.

**Cuaca dan BMKG dibatasi laju.** Cache satu jam sudah dipasang. Empat orang
yang membuka dashboard bergantian tanpa itu akan kena 429.
