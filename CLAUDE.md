@AGENTS.md

# Guidelines for Kang Cabe Dashboard

## Tech Stack

- Framework: Next.js 16 (App Router, Turbopack, TypeScript)
- Styling: Tailwind CSS 4, shadcn/ui (`radix-nova` preset)
- Database: Prisma 7 + PostgreSQL on Supabase
- Icons: Lucide React
- Charts: Recharts (not installed yet — add when the first chart lands)
- Tests: Vitest (unit) + Playwright (e2e, halaman + Server Action + Postgres)
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
e2e/                        # Playwright; cleans up after itself by "E2E" prefix
```

## Rules

- **Never import `@/lib/prisma` outside `src/server/`.** ESLint enforces this.
  Add a function to `src/server/queries/` instead. This is what makes the
  season-scoping rule below auditable.
- **Every farming data query takes `seasonId` as a required argument.** Tasks,
  logs, harvests, and finance are meaningless unscoped, and an unfiltered query
  leaks one season's numbers into another's report.
- **Exception: shared assets and knowledge.** The recipe library (`Recipe`,
  `RecipeItem`) and the shed (`Material`, `StockMovement`, `Tool`). A sack of
  fertiliser and a hoe outlive any one planting, and a recipe's value is being
  reused next season — scoping either would defeat the point. Anything that
  records *an application* of a recipe, or consumption against a season, still
  belongs to a season. Do not widen this exception without the same reasoning.
- **`Material` is one row shared by recipes and stock.** Splitting them means
  typing "NPK 16-16-16" twice and never being able to answer whether there is
  enough for a mix. Stock uses the recipe's unit for the same reason.
- **Stock status is derived, never stored** (`src/lib/stock.ts`). A status
  column and the numbers behind it are two sources for one fact.
- **Copy a recipe's amounts into whatever records using it**, rather than only
  linking. A revised recipe must not silently rewrite what was actually applied
  last season, or the post-mortem lies.
- **Stock is never deducted as a side effect.** A task reaching "Selesai" is
  not proof its mix was applied, and the board, the table and the edit dialog
  are three separate paths to that status. `recordTaskUsage` is explicit,
  idempotent (guarded by `Task.usageRecordedAt`), and reachable from anywhere.
- **A task's copied amounts are frozen once its usage is recorded.** Rewriting
  `TaskMaterial` afterwards would leave the shed short or over by the
  difference, with nothing in the movement log saying why.
- **Buying is not a cost; using is.** A purchase raises the value of the shed.
  The expense lands on a season when `recordTaskUsage` freezes the price onto
  `TaskMaterial` — a sack spanning two plantings would otherwise make both
  seasons' numbers wrong. Tools are the exception and are never depreciated.
- **Money is whole rupiah in `Int`.** `Material.avgCost` is the one `Float`,
  because it is a rate per unit rather than an amount. A float total drifts,
  and a drifting total cannot be explained to anyone.
- **`Material.avgCost` is a cache of `rebuildAvgCost`, not a second truth.**
  It is stored only so the shed's value need not replay the whole log on every
  render. Anything that edits history rather than appending to it — a price
  filled in weeks late — must recompute it from `StockMovement`.
- **A sale belongs to a season, not to a picking.** Chillies pile up waiting
  for a buyer, so what goes out is drawn from the heap. Unsold stock is derived
  — harvested less sold, per grade — and is allowed to go negative, because the
  two sides are recorded days apart and in either order.
- **Totals are never stored beside their parts.** A harvest keeps its grades
  and a sale keeps its lines; both totals are computed. The stored total is
  always the one that stops being updated.
- **Stock opname is the only place a recorded number may be overruled** by a
  physical count. It writes a `CORRECTION` movement for every row that differs
  and nothing for rows that match — but always a `StockOpname` header, so a
  count that found nothing still proves it happened.
- **Materials are archived, never deleted.** Their movement log now carries
  what each usage cost and which season it was charged to; deleting the row
  would change a season's report months after that season closed.
- **`StockMovement.seasonId` is only for stock leaving outside a task.**
  `recordTaskUsage` leaves it null on purpose — a task's cost is already frozen
  on `TaskMaterial`, and filling both would count the same usage twice.
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
pnpm test:e2e     # playwright, needs a database
pnpm db:migrate   # prisma migrate dev
pnpm db:studio
```
