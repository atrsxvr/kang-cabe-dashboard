# kang-cabe-dashboard

Dashboard bisnis pertanian cabai rawit merah

Dokumen kerja (PRD, aturan coding, langkah deployment) disimpan lokal dan tidak
ikut ke repo ini.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Prisma 7](https://prisma.io) + PostgreSQL (Supabase)
- [Vitest](https://vitest.dev)
- pnpm

## Menjalankan

```bash
pnpm install
cp .env.example .env    # isi minimal DATABASE_URL dan DIRECT_URL
pnpm db:migrate         # terapkan skema
pnpm db:seed            # 4 anggota + 1 musim contoh
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Environment

| Variabel | Dipakai oleh | Catatan |
| --- | --- | --- |
| `DATABASE_URL` | aplikasi saat runtime | Supabase: transaction pooler, port **6543** |
| `DIRECT_URL` | Prisma CLI (migrate, studio) | Supabase: session pooler, port **5432** |
| `GOOGLE_CLIENT_ID` | login | wajib di produksi |
| `GOOGLE_CLIENT_SECRET` | login | wajib di produksi |
| `BETTER_AUTH_SECRET` | tanda tangan cookie sesi | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | asal aplikasi, callback OAuth | wajib `https` di luar localhost |
| `SUPABASE_SERVICE_ROLE_KEY` | upload foto temuan | opsional; tanpanya form turun jadi teks-saja |
| `PROD_DB_REF` | penjaga basis data | ref proyek produksi — lihat di bawah |

Dua connection string dibutuhkan karena transaction pooler tidak mendukung DDL,
sehingga migrasi gagal jika dijalankan lewat port 6543.

Nilainya divalidasi saat boot oleh `src/lib/env.ts` — salah format gagal dengan
menyebut variabelnya. Tiga variabel otentikasi ditolak kalau kosong di produksi:
aplikasi yang menyala tanpa otentikasi adalah aplikasi yang seluruh endpoint
tulisnya terbuka, dan kegagalan itu tidak bersuara.

### Basis data pengembangan terpisah

`PROD_DB_REF` diisi ref proyek Supabase yang dipakai aplikasi live. Selama itu
terisi, `db:migrate`, `db:seed`, dan `test:e2e` menolak jalan kalau
`DATABASE_URL` ternyata menunjuk produksi — `migrate dev` boleh me-reset basis
data, dan seed menyuntik anggota contoh ke daftar yang berisi orang sungguhan.
`ALLOW_PROD_DB=1` untuk yang memang disengaja.

## Perintah

```bash
pnpm dev          # dev server
pnpm build        # build production
pnpm start        # jalankan hasil build
pnpm lint
pnpm typecheck
pnpm test         # vitest run
pnpm test:watch
pnpm test:e2e     # playwright; bangun sendiri di port 3100

pnpm db:migrate   # prisma migrate dev
pnpm db:deploy    # prisma migrate deploy (production)
pnpm db:seed
pnpm db:studio
pnpm db:generate
```

## Struktur

```
src/
  app/
    layout.tsx           # <html>/<body>, font, theme provider
    global-error.tsx
    (dashboard)/         # route group — 8 modul, tanpa segmen URL
      layout.tsx         # app shell (sidebar + navbar)
      error.tsx          # menangkap error halaman, bukan error layout
      loading.tsx
      not-found.tsx
  components/
    layout/              # app shell, sidebar, theme toggle
    seasons/
    common/
    ui/                  # shadcn — hasil generate, jangan diedit manual
  server/queries/        # semua akses database (ESLint menegakkan ini)
  lib/                   # env, prisma, nav, utils
  generated/prisma/      # Prisma client — gitignored
prisma/
  schema.prisma
  migrations/
  seed.ts
```

## Catatan

- Setiap tabel baru wajib diberi `ENABLE ROW LEVEL SECURITY` di migrasinya.
  Supabase mengekspos schema `public` lewat PostgREST, dan Postgres tidak
  mengaktifkan RLS secara otomatis.
- Login lewat Google saja, dan bersifat undangan: pendaftaran sendiri dimatikan,
  jadi yang emailnya belum didaftarkan Admin tidak punya jalan masuk.
- Membaca terbuka untuk semua yang sudah masuk; menulis dijaga per wilayah lewat
  empat peran. Penegakannya ada di setiap Server Action — bukan di tombolnya,
  yang cuma disembunyikan demi kerapian.
