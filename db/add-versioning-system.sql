-- Migration: Add Note Versioning System
-- This adds comprehensive version support while maintaining backward compatibility

-- ===================================
-- 0. ENSURE NOTES TABLE COMPATIBILITY
-- ===================================
-- Add updated_at column if it doesn't exist (for backward compatibility)
ALTER TABLE IF EXISTS public.notes 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger as $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===================================
-- 1. CORE VERSIONING TABLES
-- ===================================

-- Note versions table for maintaining content history
CREATE TABLE IF NOT EXISTS public.note_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  version_label text,                       -- User-friendly name: "Technical Deep-dive", "Beginner Guide"
  version_description text,                 -- Detailed explanation of this version
  version_type text DEFAULT 'manual' CHECK (version_type IN ('manual', 'auto', 'imported')),
  is_current boolean DEFAULT false,         -- Which version is currently displayed
  is_default boolean DEFAULT false,         -- Default version for new visitors
  version_tags text[] DEFAULT '{}',         -- Version-specific tags
  metadata jsonb DEFAULT '{}',              -- Flexible metadata storage
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  embedding vector(384)                     -- Version-specific embeddings for search
);

-- Version relationships table (for future branching/merging)
CREATE TABLE IF NOT EXISTS public.version_relationships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_version_id uuid REFERENCES public.note_versions(id) ON DELETE CASCADE,
  child_version_id uuid REFERENCES public.note_versions(id) ON DELETE CASCADE,
  relationship_type text CHECK (relationship_type IN ('derived_from', 'merged_with', 'branched_from')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ===================================
-- 2. INDEXES FOR PERFORMANCE
-- ===================================

-- Core indexes for note_versions
CREATE INDEX IF NOT EXISTS note_versions_note_id_idx ON public.note_versions(note_id);
CREATE INDEX IF NOT EXISTS note_versions_user_id_idx ON public.note_versions(user_id);
CREATE INDEX IF NOT EXISTS note_versions_current_idx ON public.note_versions(note_id, is_current);
CREATE INDEX IF NOT EXISTS note_versions_default_idx ON public.note_versions(note_id, is_default);
CREATE INDEX IF NOT EXISTS note_versions_type_idx ON public.note_versions(version_type);
CREATE INDEX IF NOT EXISTS note_versions_created_idx ON public.note_versions(created_at DESC);

-- Embedding index for semantic search
CREATE INDEX IF NOT EXISTS note_versions_embedding_idx ON public.note_versions 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Version tags index
CREATE INDEX IF NOT EXISTS note_versions_tags_idx ON public.note_versions USING gin (version_tags);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS version_relationships_parent_idx ON public.version_relationships(parent_version_id);
CREATE INDEX IF NOT EXISTS version_relationships_child_idx ON public.version_relationships(child_version_id);

-- ===================================
-- 3. CONSTRAINTS
-- ===================================

-- Ensure single current version per note
CREATE UNIQUE INDEX IF NOT EXISTS note_versions_single_current_per_note
  ON public.note_versions (note_id)
  WHERE is_current = true;

-- Ensure single default version per note  
CREATE UNIQUE INDEX IF NOT EXISTS note_versions_single_default_per_note
  ON public.note_versions (note_id)
  WHERE is_default = true;

-- ===================================
-- 4. ROW LEVEL SECURITY
-- ===================================

-- Enable RLS
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_versions
DROP POLICY IF EXISTS "note_versions_read_own" ON public.note_versions;
CREATE POLICY "note_versions_read_own" ON public.note_versions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "note_versions_all_using" ON public.note_versions;
CREATE POLICY "note_versions_all_using" ON public.note_versions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for version_relationships
DROP POLICY IF EXISTS "version_relationships_read_own" ON public.version_relationships;
CREATE POLICY "version_relationships_read_own" ON public.version_relationships
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "version_relationships_all_using" ON public.version_relationships;
CREATE POLICY "version_relationships_all_using" ON public.version_relationships
  FOR ALL USING (auth.uid() = user_id);

-- ===================================
-- 5. TRIGGERS AND FUNCTIONS
-- ===================================

-- Function to handle updated_at timestamp for versions
DROP TRIGGER IF EXISTS note_versions_updated_at ON public.note_versions;
CREATE TRIGGER note_versions_updated_at BEFORE UPDATE ON public.note_versions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-manage version states
CREATE OR REPLACE FUNCTION public.note_versions_manage_state()
RETURNS trigger AS $$
BEGIN
  -- If marking as current, unset other current versions for this note
  IF NEW.is_current = true THEN
    UPDATE public.note_versions 
    SET is_current = false 
    WHERE note_id = NEW.note_id 
      AND id != COALESCE(NEW.id, gen_random_uuid())
      AND user_id = NEW.user_id;
  END IF;
  
  -- If marking as default, unset other default versions for this note
  IF NEW.is_default = true THEN
    UPDATE public.note_versions 
    SET is_default = false 
    WHERE note_id = NEW.note_id 
      AND id != COALESCE(NEW.id, gen_random_uuid())
      AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-managing version states
DROP TRIGGER IF EXISTS note_versions_manage_state ON public.note_versions;
CREATE TRIGGER note_versions_manage_state
  BEFORE INSERT OR UPDATE ON public.note_versions
  FOR EACH ROW EXECUTE FUNCTION public.note_versions_manage_state();

-- ===================================
-- 6. VERSION MANAGEMENT FUNCTIONS
-- ===================================

-- Get all versions for a note
DROP FUNCTION IF EXISTS public.get_note_versions(uuid);
CREATE OR REPLACE FUNCTION public.get_note_versions(note_id_param uuid)
RETURNS TABLE (
  id uuid,
  content text,
  version_label text,
  version_description text,
  version_type text,
  is_current boolean,
  is_default boolean,
  version_tags text[],
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  content_length integer,
  has_embedding boolean
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    nv.id,
    nv.content,
    nv.version_label,
    nv.version_description,
    nv.version_type,
    nv.is_current,
    nv.is_default,
    nv.version_tags,
    nv.metadata,
    nv.created_at,
    nv.updated_at,
    length(nv.content) as content_length,
    (nv.embedding IS NOT NULL) as has_embedding
  FROM note_versions nv
  WHERE nv.note_id = note_id_param
    AND nv.user_id = auth.uid()
  ORDER BY nv.created_at DESC;
$$;

-- Switch current version
DROP FUNCTION IF EXISTS public.switch_current_version(uuid, uuid);
CREATE OR REPLACE FUNCTION public.switch_current_version(
  note_id_param uuid,
  version_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verify the version belongs to the note and user
  IF NOT EXISTS (
    SELECT 1 FROM note_versions 
    WHERE id = version_id_param 
      AND note_id = note_id_param 
      AND user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;
  
  -- Update current version
  UPDATE note_versions
  SET is_current = (id = version_id_param),
      updated_at = NOW()
  WHERE note_id = note_id_param
    AND user_id = auth.uid();
  
  -- Update the main note's content to match current version
  UPDATE notes 
  SET content = nv.content,
      updated_at = NOW()
  FROM note_versions nv
  WHERE notes.id = note_id_param
    AND nv.id = version_id_param
    AND notes.user_id = auth.uid();
  
  RETURN true;
END;
$$;

-- Create version from current note content
DROP FUNCTION IF EXISTS public.create_version_from_current(uuid, text, text, text, text[]);
CREATE OR REPLACE FUNCTION public.create_version_from_current(
  note_id_param uuid,
  version_label_param text,
  version_description_param text DEFAULT NULL,
  version_type_param text DEFAULT 'manual',
  version_tags_param text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  version_id uuid;
  current_content text;
  current_embedding vector(384);
BEGIN
  -- Get current note content and embedding
  SELECT content, embedding INTO current_content, current_embedding
  FROM notes 
  WHERE id = note_id_param AND user_id = auth.uid();
  
  IF current_content IS NULL THEN
    RAISE EXCEPTION 'Note not found or no content';
  END IF;
  
  -- Create new version
  INSERT INTO note_versions (
    note_id,
    content,
    version_label,
    version_description,
    version_type,
    version_tags,
    is_current,
    user_id,
    embedding
  ) VALUES (
    note_id_param,
    current_content,
    version_label_param,
    version_description_param,
    version_type_param,
    version_tags_param,
    true,  -- Make this the current version
    auth.uid(),
    current_embedding
  ) RETURNING id INTO version_id;
  
  RETURN version_id;
END;
$$;

-- ===================================
-- 7. ENHANCED SEARCH WITH VERSIONS
-- ===================================

-- Enhanced search across notes and versions
DROP FUNCTION IF EXISTS public.search_notes_with_versions(text, uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.search_notes_with_versions(
  q text,
  folder_filter uuid DEFAULT NULL,
  page_param integer DEFAULT 1,
  page_size integer DEFAULT 20
)
RETURNS TABLE (
  note_id uuid,
  folder_id uuid,
  title text,
  content text,
  version_id uuid,
  version_label text,
  is_current_version boolean,
  rank real,
  snippet_title text,
  snippet_content text,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH tsq AS (
    SELECT websearch_to_tsquery('english', COALESCE(q, '')) as query
  ),
  -- Search in main notes content (current versions)
  note_matches AS (
    SELECT 
      n.id as note_id,
      n.folder_id,
      n.title,
      n.content,
      NULL::uuid as version_id,
      'Current'::text as version_label,
      true as is_current_version,
      ts_rank(
        setweight(to_tsvector('english', COALESCE(n.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(n.content, '')), 'B'),
        (SELECT query FROM tsq)
      ) as rank,
      ts_headline('english', n.title, (SELECT query FROM tsq), 
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=15') as snippet_title,
      CASE 
        WHEN n.content IS NOT NULL THEN 
          ts_headline('english', n.content, (SELECT query FROM tsq), 
            'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30') 
      END as snippet_content,
      n.created_at,
      n.updated_at
    FROM notes n
    WHERE n.user_id = auth.uid()
      AND (folder_filter IS NULL OR n.folder_id = folder_filter)
      AND (
        setweight(to_tsvector('english', COALESCE(n.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(n.content, '')), 'B')
      ) @@ (SELECT query FROM tsq)
  ),
  -- Search in version content
  version_matches AS (
    SELECT 
      nv.note_id,
      n.folder_id,
      n.title,
      nv.content,
      nv.id as version_id,
      COALESCE(nv.version_label, 'Version') as version_label,
      nv.is_current as is_current_version,
      ts_rank(
        setweight(to_tsvector('english', COALESCE(n.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(nv.content, '')), 'B'),
        (SELECT query FROM tsq)
      ) as rank,
      ts_headline('english', n.title, (SELECT query FROM tsq), 
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=15') as snippet_title,
      ts_headline('english', nv.content, (SELECT query FROM tsq), 
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30') as snippet_content,
      nv.created_at,
      nv.updated_at
    FROM note_versions nv
    JOIN notes n ON n.id = nv.note_id
    WHERE nv.user_id = auth.uid()
      AND (folder_filter IS NULL OR n.folder_id = folder_filter)
      AND to_tsvector('english', COALESCE(nv.content, '')) @@ (SELECT query FROM tsq)
      AND NOT nv.is_current  -- Don't duplicate current version results
  )
  -- Combine and rank all results
  SELECT * FROM (
    SELECT * FROM note_matches
    UNION ALL
    SELECT * FROM version_matches
  ) combined
  ORDER BY rank DESC, updated_at DESC
  OFFSET GREATEST(0, (page_param - 1)) * page_size
  LIMIT page_size;
$$;

-- Enhanced vector search across all versions
DROP FUNCTION IF EXISTS public.match_notes_and_versions(vector, float, int);
CREATE OR REPLACE FUNCTION public.match_notes_and_versions(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  note_id uuid,
  title text,
  content text,
  version_id uuid,
  version_label text,
  is_current_version boolean,
  similarity float,
  folder_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH note_matches AS (
    -- Search current note content
    SELECT 
      n.id as note_id,
      n.title,
      n.content,
      NULL::uuid as version_id,
      'Current'::text as version_label,
      true as is_current_version,
      1 - (n.embedding <=> query_embedding) as similarity,
      n.folder_id
    FROM notes n
    WHERE n.embedding IS NOT NULL
      AND n.user_id = auth.uid()
      AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ),
  version_matches AS (
    -- Search version content
    SELECT 
      nv.note_id,
      n.title,
      nv.content,
      nv.id as version_id,
      COALESCE(nv.version_label, 'Version') as version_label,
      nv.is_current as is_current_version,
      1 - (nv.embedding <=> query_embedding) as similarity,
      n.folder_id
    FROM note_versions nv
    JOIN notes n ON n.id = nv.note_id
    WHERE nv.embedding IS NOT NULL
      AND nv.user_id = auth.uid()
      AND 1 - (nv.embedding <=> query_embedding) > match_threshold
      AND NOT nv.is_current  -- Avoid duplicating current versions
  )
  -- Combine and return top matches
  SELECT * FROM (
    SELECT * FROM note_matches
    UNION ALL  
    SELECT * FROM version_matches
  ) combined
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ===================================
-- 8. VIEWS AND HELPERS
-- ===================================

-- Enhanced notes view with version info
DROP VIEW IF EXISTS public.notes_with_versions;
CREATE VIEW public.notes_with_versions AS
SELECT 
  n.*,
  f.name as folder_name,
  COALESCE(v.version_count, 0) as version_count,
  COALESCE(v.has_multiple_versions, false) as has_multiple_versions,
  cv.version_label as current_version_label,
  cv.version_description as current_version_description
FROM notes n
LEFT JOIN folders f ON f.id = n.folder_id
LEFT JOIN (
  SELECT 
    note_id,
    COUNT(*) as version_count,
    (COUNT(*) > 0) as has_multiple_versions
  FROM note_versions
  GROUP BY note_id
) v ON v.note_id = n.id
LEFT JOIN note_versions cv ON cv.note_id = n.id AND cv.is_current = true;

-- Function to get version statistics
DROP FUNCTION IF EXISTS public.get_version_stats();
CREATE OR REPLACE FUNCTION public.get_version_stats()
RETURNS TABLE (
  total_notes bigint,
  notes_with_versions bigint,
  total_versions bigint,
  avg_versions_per_note numeric,
  most_versioned_note_id uuid,
  most_versioned_note_title text,
  max_versions bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    (SELECT COUNT(*) FROM notes WHERE user_id = auth.uid()) as total_notes,
    (SELECT COUNT(DISTINCT note_id) FROM note_versions WHERE user_id = auth.uid()) as notes_with_versions,
    (SELECT COUNT(*) FROM note_versions WHERE user_id = auth.uid()) as total_versions,
    (SELECT ROUND(AVG(version_count), 2) FROM (
      SELECT COUNT(*) as version_count 
      FROM note_versions 
      WHERE user_id = auth.uid() 
      GROUP BY note_id
    ) v) as avg_versions_per_note,
    mvn.note_id as most_versioned_note_id,
    mvn.title as most_versioned_note_title,
    mvn.version_count as max_versions
  FROM (
    SELECT 
      nv.note_id, 
      n.title,
      COUNT(*) as version_count
    FROM note_versions nv
    JOIN notes n ON n.id = nv.note_id
    WHERE nv.user_id = auth.uid()
    GROUP BY nv.note_id, n.title
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) mvn;
$$;

-- ===================================
-- 9. DATA MIGRATION
-- ===================================

-- Migrate existing note content to versions (run this after deployment)
-- This creates an initial "Original" version for all existing notes with content
/*
INSERT INTO public.note_versions (
  note_id,
  content,
  version_label,
  version_description,
  version_type,
  is_current,
  is_default,
  user_id,
  created_at,
  embedding
)
SELECT 
  id,
  content,
  'Original',
  'Initial version migrated from main content',
  'auto',
  true,
  true,
  user_id,
  created_at,
  embedding
FROM public.notes 
WHERE content IS NOT NULL 
  AND content != ''
  AND NOT EXISTS (
    SELECT 1 FROM note_versions 
    WHERE note_versions.note_id = notes.id
  );
*/