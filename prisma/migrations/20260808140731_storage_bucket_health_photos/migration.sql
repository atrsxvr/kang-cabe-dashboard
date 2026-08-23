-- Storage bucket for plant-finding photos, created here so a fresh environment
-- is reproducible from migrations alone rather than clicking through the
-- Supabase dashboard.
--
-- Guarded: `migrate dev` replays migrations against a shadow database that has
-- no `storage` schema, and an unguarded INSERT would abort it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'health-photos',
      'health-photos',
      -- Public read: object names are UUID-based and unguessable, and serving
      -- them directly avoids minting a signed URL on every card render.
      -- Writes stay closed — uploads go through the server with the service
      -- role, so no anon insert policy is granted.
      true,
      5242880, -- 5 MB; the client downscales before upload, this is the ceiling
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = EXCLUDED.public,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END
$$;
