-- Add ordering support for note versions
ALTER TABLE public.note_versions 
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Add index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_note_versions_order 
ON public.note_versions(note_id, order_index DESC);

-- Update existing versions to have sequential order_index based on creation date
UPDATE public.note_versions nv
SET order_index = sub.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY note_id ORDER BY created_at DESC) as row_num
    FROM public.note_versions
) sub
WHERE nv.id = sub.id;