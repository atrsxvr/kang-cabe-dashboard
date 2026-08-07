# kang-cabe-dashboard

Dashboard bisnis pertanian cabai rawit merah

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- TypeScript
- [Tailwind CSS 4](https://tailwindcss.com)
- ESLint
- pnpm

## Menjalankan

```bash
pnpm install
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Perintah lain

```bash
pnpm build   # build production
pnpm start   # jalankan hasil build
pnpm lint    # cek lint
```

## Struktur

```
src/app/          # route, layout, dan page (App Router)
public/           # aset statis
```

Import alias `@/*` mengarah ke `src/*`.
