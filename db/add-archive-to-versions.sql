-- Add archive functionality to note_versions table
ALTER TABLE public.note_versions 
ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Add index for efficient querying of non-archived versions
CREATE INDEX IF NOT EXISTS idx_note_versions_archived 
ON public.note_versions(note_id, archived_at) 
WHERE archived_at IS NULL;

-- Update the get_note_versions function to exclude archived versions by default
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
  has_embedding boolean,
  archived_at timestamptz
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
    (nv.embedding IS NOT NULL) as has_embedding,
    nv.archived_at
  FROM public.note_versions nv
  WHERE nv.note_id = note_id_param
    AND nv.archived_at IS NULL  -- Filter out archived versions
    AND nv.user_id = auth.uid()
  ORDER BY nv.created_at DESC;
$$;

-- Function to get archived versions
CREATE OR REPLACE FUNCTION public.get_archived_versions(note_id_param uuid)
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
  archived_at timestamptz,
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
    nv.archived_at,
    length(nv.content) as content_length,
    (nv.embedding IS NOT NULL) as has_embedding
  FROM public.note_versions nv
  WHERE nv.note_id = note_id_param
    AND nv.archived_at IS NOT NULL  -- Only archived versions
    AND nv.user_id = auth.uid()
  ORDER BY nv.archived_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_note_versions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_archived_versions TO authenticated;