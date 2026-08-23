-- Prisma's own bookkeeping table also lives in `public`, so Supabase's advisor
-- flags it too. Prisma connects with BYPASSRLS and keeps working; this only
-- shuts the table off from the PostgREST-exposed roles.
--
-- Guarded because `migrate dev` replays migrations against a shadow database
-- where `_prisma_migrations` does not exist, and an unguarded ALTER aborts it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;
