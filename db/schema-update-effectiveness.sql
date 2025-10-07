-- Add effectiveness rating to answers table
ALTER TABLE public.answers 
ADD COLUMN IF NOT EXISTS effectiveness text CHECK (effectiveness IN ('worked-well', 'needs-work', 'untested')) DEFAULT 'untested';

-- Update the questions_with_answers view to include effectiveness
DROP VIEW IF EXISTS public.questions_with_answers;
CREATE OR REPLACE VIEW public.questions_with_answers AS
SELECT 
  q.*,
  CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS has_answer,
  a.answer AS current_answer,
  a.version_name AS current_version,
  a.notes AS answer_notes,
  a.effectiveness AS answer_effectiveness
FROM public.questions q
LEFT JOIN public.answers a ON a.question_id = q.id AND a.is_current = true;
