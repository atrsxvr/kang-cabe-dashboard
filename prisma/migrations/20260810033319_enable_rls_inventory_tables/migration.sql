-- Every new table in `public` needs this: Supabase exposes the schema through
-- PostgREST and Postgres does not enable row-level security on its own. Prisma
-- connects with BYPASSRLS, so the app is unaffected.
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tool" ENABLE ROW LEVEL SECURITY;
