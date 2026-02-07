-- ─── Mapping Sessions ────────────────────────────────────
-- Stores in-progress and completed ModIQ mapping sessions
-- so users can resume work and view mapping history.

CREATE TABLE public.mapping_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source info
  source_type text NOT NULL CHECK (source_type IN ('elm-ridge', 'other-vendor')),
  sequence_slug text,            -- null for other-vendor
  sequence_title text NOT NULL,
  layout_filename text NOT NULL,

  -- Progress
  current_phase text NOT NULL DEFAULT 'auto-accept',
  mapped_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  coverage_percent integer NOT NULL DEFAULT 0,

  -- Serialised mapping state (assignments, rejections, skips, etc.)
  state_data jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Lifecycle
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX mapping_sessions_user_id_idx ON public.mapping_sessions(user_id);
CREATE INDEX mapping_sessions_status_idx ON public.mapping_sessions(user_id, status);

-- RLS
ALTER TABLE public.mapping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.mapping_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.mapping_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.mapping_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.mapping_sessions FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mapping_sessions TO authenticated;

-- ─── xmap Files ──────────────────────────────────────────
-- Archive of exported .xmap files for download history.

CREATE TABLE public.xmap_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.mapping_sessions(id) ON DELETE SET NULL,

  -- File info
  filename text NOT NULL,
  sequence_title text NOT NULL,
  layout_filename text NOT NULL,

  -- Stats at time of export
  item_count integer NOT NULL DEFAULT 0,
  coverage_percent integer NOT NULL DEFAULT 0,

  -- The actual xmap XML content (typically < 20KB)
  content text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX xmap_files_user_id_idx ON public.xmap_files(user_id);

-- RLS
ALTER TABLE public.xmap_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xmaps"
  ON public.xmap_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xmaps"
  ON public.xmap_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own xmaps"
  ON public.xmap_files FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.xmap_files TO authenticated;
