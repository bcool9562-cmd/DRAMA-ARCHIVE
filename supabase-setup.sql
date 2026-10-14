-- ============================================================
-- Drama Archive — Supabase Setup Script (Single-Profile Sync)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the main table without auth.users foreign key constraint
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_dramas_v2 (
  user_id             uuid        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  drama_id            text        NOT NULL,
  tmdb_id             integer,
  title               text        NOT NULL DEFAULT '',
  native_title        text        NOT NULL DEFAULT '',
  poster_url          text        NOT NULL DEFAULT '',
  country             text        NOT NULL DEFAULT '',
  release_year        integer,
  total_episodes      integer,
  rating              numeric(4,2) NOT NULL DEFAULT 0,
  status              text        NOT NULL CHECK (status IN ('watchlist', 'watching', 'finished')),
  airing_status       text        NOT NULL DEFAULT 'completed' CHECK (airing_status IN ('ongoing', 'completed', 'upcoming')),
  first_air_date      date,
  next_episode_date   date,
  next_episode_number integer,
  updated_at          timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, drama_id)
);

-- 2. If table was previously created with auth.users FK constraint, drop it:
-- ============================================================
ALTER TABLE public.user_dramas_v2
  DROP CONSTRAINT IF EXISTS user_dramas_v2_user_id_fkey;

-- 3. Indexes for fast queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_dramas_v2_user_status
  ON public.user_dramas_v2 (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_dramas_v2_updated
  ON public.user_dramas_v2 (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_dramas_v2_airing
  ON public.user_dramas_v2 (user_id, airing_status, next_episode_date)
  WHERE airing_status IN ('upcoming', 'ongoing');

-- 4. Enable Row Level Security (Service Role bypasses RLS automatically)
-- ============================================================
ALTER TABLE public.user_dramas_v2 ENABLE ROW LEVEL SECURITY;

-- Allow full access when queried via service role or matching fixed profile
DROP POLICY IF EXISTS "Allow single profile access" ON public.user_dramas_v2;
CREATE POLICY "Allow single profile access"
  ON public.user_dramas_v2
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Auto-update `updated_at` trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_dramas_v2_updated_at ON public.user_dramas_v2;
CREATE TRIGGER trg_user_dramas_v2_updated_at
  BEFORE UPDATE ON public.user_dramas_v2
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Grant usage
-- ============================================================
GRANT ALL ON public.user_dramas_v2 TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================
-- Done! Table user_dramas_v2 is ready for single-profile cross-device sync.
-- ============================================================
