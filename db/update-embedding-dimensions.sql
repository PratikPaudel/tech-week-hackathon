-- Update embedding column dimensions for all-MiniLM-L6-v2 model (384 dimensions)
-- Drop the old column and recreate with correct dimensions

-- First, drop the existing embedding column if it exists
ALTER TABLE public.answers DROP COLUMN IF EXISTS embedding;

-- Add the new embedding column with correct dimensions
ALTER TABLE public.answers ADD COLUMN embedding vector(384);

-- Update the match_answers function to work with 384-dimensional vectors
CREATE OR REPLACE FUNCTION match_answers (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  question_id uuid,
  answer_content text,
  question_content text,
  similarity float,
  folder_id uuid
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    a.id,
    a.question_id,
    a.answer as answer_content,
    q.question as question_content,
    1 - (a.embedding <=> query_embedding) as similarity,
    q.folder_id
  FROM answers AS a
  JOIN questions AS q ON a.question_id = q.id
  WHERE a.embedding IS NOT NULL
    AND (auth.uid() IS NULL OR a.user_id = auth.uid()) -- Allow service role or filter by user
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Recreate the index for the new dimensions
DROP INDEX IF EXISTS answers_embedding_idx;
CREATE INDEX ON public.answers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
