-- Migration: Make version_label mandatory for note_versions
-- This ensures all versions have titles, since they serve as headings

-- First, update any existing versions that have NULL or empty version_label
UPDATE public.note_versions
SET version_label = 'Untitled'
WHERE version_label IS NULL
   OR version_label = '';

-- Now make the column NOT NULL
ALTER TABLE public.note_versions
ALTER COLUMN version_label SET NOT NULL;

-- Add a check constraint to ensure it's not empty
ALTER TABLE public.note_versions
ADD CONSTRAINT version_label_not_empty
CHECK (version_label IS NOT NULL AND trim(version_label) != '');