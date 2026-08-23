# kang-cabe-dashboard

Dashboard bisnis pertanian cabai rawit merah

Kebutuhan produk ada di [PRD.md](PRD.md); aturan coding dan struktur folder di
[CLAUDE.md](CLAUDE.md).

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
cp .env.example .env    # isi DATABASE_URL dan DIRECT_URL
pnpm db:migrate         # terapkan skema
pnpm db:seed            # 1 musim contoh (opsional)
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Environment

Dua variabel, keduanya connection string PostgreSQL:

| Variabel | Dipakai oleh | Catatan |
| --- | --- | --- |
| `DATABASE_URL` | aplikasi saat runtime | Supabase: transaction pooler, port **6543** |
| `DIRECT_URL` | Prisma CLI (migrate, studio) | Supabase: session pooler, port **5432** |

Keduanya dibutuhkan karena transaction pooler tidak mendukung DDL, sehingga
migrasi gagal jika dijalankan lewat port 6543. Nilainya divalidasi saat boot
oleh `src/lib/env.ts` — salah format akan gagal dengan menyebut variabelnya.

## Perintah

```bash
pnpm dev          # dev server
pnpm build        # build production
pnpm start        # jalankan hasil build
pnpm lint
pnpm typecheck
pnpm test         # vitest run
pnpm test:watch

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
- Autentikasi belum ada. Seluruh aplikasi masih terbuka.
