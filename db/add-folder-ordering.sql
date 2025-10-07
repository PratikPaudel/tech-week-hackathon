-- Migration to add order_index to folders table for reordering functionality

-- Add order_index column to folders table
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Create index for better performance when ordering folders
CREATE INDEX IF NOT EXISTS folders_order_idx 
ON public.folders(user_id, order_index DESC);

-- Update existing folders to have sequential order_index values
-- This ensures existing folders get proper ordering
WITH numbered_folders AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM public.folders
  WHERE order_index = 0 OR order_index IS NULL
)
UPDATE public.folders f
SET order_index = nf.rn
FROM numbered_folders nf
WHERE f.id = nf.id;

-- Drop and recreate the folders_with_stats view to include order_index
DROP VIEW IF EXISTS public.folders_with_stats;

CREATE VIEW public.folders_with_stats AS
SELECT 
  f.*,
  COUNT(n.id) AS question_count,
  COUNT(CASE WHEN n.content IS NOT NULL AND n.content != '' THEN 1 END) AS answered_count
FROM public.folders f
LEFT JOIN public.notes n ON n.folder_id = f.id
GROUP BY f.id;