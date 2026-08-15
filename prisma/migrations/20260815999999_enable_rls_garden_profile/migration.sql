-- Every new table in `public` needs this: Supabase exposes the schema through
-- PostgREST and Postgres does not enable row-level security on its own.
ALTER TABLE "GardenProfile" ENABLE ROW LEVEL SECURITY;
