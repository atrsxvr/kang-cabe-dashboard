@AGENTS.md

# Guidelines for Kang Cabe Dashboard

## Tech Stack

- Framework: Next.js 16 (App Router, Turbopack, TypeScript)
- Styling: Tailwind CSS 4, shadcn/ui (`radix-nova` preset)
- Database: Prisma 7 + PostgreSQL on Supabase
- Icons: Lucide React
- Charts: Recharts (not installed yet — add when the first chart lands)
- Tests: Vitest
- Package manager: **pnpm** (not npm — the repo pins `pnpm@11.20.0`)

## Project Structure

```
src/
  app/
    layout.tsx              # <html>/<body> and fonts only
    global-error.tsx        # last resort; cannot use app styling
    (dashboard)/            # route group — all eight modules, no URL segment
      layout.tsx            # app shell
      error.tsx             # catches failures in pages, NOT in its own layout
      loading.tsx
      not-found.tsx
  components/
    layout/                 # app shell, sidebar
    seasons/                # season-scoped components
    common/                 # generic presentational pieces
    ui/                     # shadcn — regenerated, do not hand-edit
  server/
    queries/                # every database read lives here
  lib/                      # env, prisma client, nav config, utils
  generated/prisma/         # Prisma client — gitignored, `prisma generate`
```

## Rules

- **Never import `@/lib/prisma` outside `src/server/`.** ESLint enforces this.
  Add a function to `src/server/queries/` instead. This is what makes the
  season-scoping rule below auditable.
- **Every farming data query takes `seasonId` as a required argument.** Tasks,
  logs, harvests, and finance are meaningless unscoped, and an unfiltered query
  leaks one season's numbers into another's report.
- Reads that must be fresh need **both** `await connection()` and a `<Suspense>`
  boundary. Suspense alone still prerenders at build time and freezes the data.
- Anything rendered from a **layout** must handle its own failure. A layout's
  throw skips `error.tsx` and hits `global-error`, blanking the whole shell.
- Mobile-first: the dashboard is used in the field on phones.
- Every new table needs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in its
  migration. Postgres does not do this automatically, and Supabase exposes
  `public` through PostgREST.

## Commands

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm lint
pnpm typecheck
pnpm test         # vitest run
pnpm db:migrate   # prisma migrate dev
pnpm db:studio
```
