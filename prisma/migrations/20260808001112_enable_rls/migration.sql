-- Supabase exposes every table in `public` through PostgREST, and grants the
-- `anon` / `authenticated` roles full DML on them by default. Without RLS that
-- means anyone holding the (publicly distributed) anon key can read and delete
-- all data.
--
-- The app talks to Postgres through Prisma as the `postgres` role, which has
-- BYPASSRLS, so enabling RLS costs the app nothing. No policies are defined on
-- purpose: with RLS on and zero policies, anon/authenticated see no rows at
-- all. Add policies only if you later query these tables from the browser via
-- supabase-js.
--
-- NOTE: every future table added to `public` needs the same treatment —
-- Postgres does not enable RLS automatically.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Season" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskAssignee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HarvestLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinanceTransaction" ENABLE ROW LEVEL SECURITY;

-- Defence in depth: RLS alone already blocks these roles, but revoking the
-- grants means a future table-level policy cannot accidentally re-expose data.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- Stop Supabase's default privileges from re-granting on tables created later.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
