-- Simplified Supabase SQL schema for InfoVault (with RLS and safeguards)

-- Enable Row Level Security
alter table if exists public.folders enable row level security;
alter table if exists public.questions enable row level security;
alter table if exists public.answers enable row level security;

-- Folders: simple organization containers
create table if not exists public.folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  tags text[] default '{}',
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Questions: simple text storage
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  folder_id uuid references public.folders(id) on delete cascade not null,
  question text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Answers: response storage with simple versioning
create table if not exists public.answers (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  answer text not null,
  version_name text default 'v1',
  notes text,
  is_current boolean default true,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- RLS Policies: read + write protection per user
drop policy if exists "folders_read_own" on public.folders;
create policy "folders_read_own" on public.folders
  for select using (auth.uid() = user_id);
drop policy if exists "folders_all_using" on public.folders;
create policy "folders_all_using" on public.folders
  for all using (auth.uid() = user_id);
drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
  for insert with check (auth.uid() = user_id);
drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "questions_read_own" on public.questions;
create policy "questions_read_own" on public.questions
  for select using (auth.uid() = user_id);
drop policy if exists "questions_all_using" on public.questions;
create policy "questions_all_using" on public.questions
  for all using (auth.uid() = user_id);
drop policy if exists "questions_insert_own" on public.questions;
create policy "questions_insert_own" on public.questions
  for insert with check (auth.uid() = user_id);
drop policy if exists "questions_update_own" on public.questions;
create policy "questions_update_own" on public.questions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "answers_read_own" on public.answers;
create policy "answers_read_own" on public.answers
  for select using (auth.uid() = user_id);
drop policy if exists "answers_all_using" on public.answers;
create policy "answers_all_using" on public.answers
  for all using (auth.uid() = user_id);
drop policy if exists "answers_insert_own" on public.answers;
create policy "answers_insert_own" on public.answers
  for insert with check (auth.uid() = user_id);
drop policy if exists "answers_update_own" on public.answers;
create policy "answers_update_own" on public.answers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indexes for better performance
create index if not exists folders_user_id_idx on public.folders(user_id);
create index if not exists questions_folder_id_idx on public.questions(folder_id);
create index if not exists questions_user_id_idx on public.questions(user_id);
create index if not exists answers_question_id_idx on public.answers(question_id);
create index if not exists answers_user_id_idx on public.answers(user_id);
create index if not exists answers_current_idx on public.answers(question_id, is_current);

-- Enforce a single current answer per question
create unique index if not exists answers_single_current_per_question
  on public.answers (question_id)
  where is_current = true;

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- OPTIONAL but recommended: ensure only one current per question by auto-clearing others
create or replace function public.answers_enforce_single_current()
returns trigger as $$
begin
  if coalesce(new.is_current, false) is true then
    update public.answers
      set is_current = false
      where question_id = new.question_id
        and id is distinct from new.id;
  end if;
  return new;
end;
$$ language plpgsql;

-- Triggers
drop trigger if exists folders_updated_at on public.folders;
create trigger folders_updated_at before update on public.folders
  for each row execute function public.handle_updated_at();

drop trigger if exists answers_updated_at on public.answers;
create trigger answers_updated_at before update on public.answers
  for each row execute function public.handle_updated_at();

drop trigger if exists answers_enforce_single_current on public.answers;
create trigger answers_enforce_single_current
  before insert or update on public.answers
  for each row execute function public.answers_enforce_single_current();

-- Views for common queries
create or replace view public.folders_with_stats as
select 
  f.*,
  count(q.id) as question_count,
  count(case when a.is_current = true then 1 end) as answered_count
from public.folders f
left join public.questions q on q.folder_id = f.id
left join public.answers a on a.question_id = q.id and a.is_current = true
group by f.id;

create or replace view public.questions_with_answers as
select 
  q.*,
  case when a.id is not null then true else false end as has_answer,
  a.answer as current_answer,
  a.version_name as current_version,
  a.notes as answer_notes
from public.questions q
left join public.answers a on a.question_id = q.id and a.is_current = true;

-- Full-text search support (indexes and RPC)
-- Expression indexes to speed FTS on questions/answers
create extension if not exists pg_trgm;
create index if not exists questions_fts_idx on public.questions using gin (to_tsvector('english', coalesce(question, '')));
create index if not exists answers_fts_idx on public.answers using gin (to_tsvector('english', coalesce(answer, '')));

-- RPC: search across current answers + questions for the current user
drop function if exists public.search_qa(text, uuid);
drop function if exists public.search_qa(text, uuid, integer, integer);
create or replace function public.search_qa(
  q text,
  folder uuid default null,
  page integer default 1,
  page_size integer default 20
)
returns table (
  qa_id uuid,
  folder_id uuid,
  question text,
  answer text,
  rank real,
  snippet_question text,
  snippet_answer text,
  created_at timestamptz,
  updated_at timestamptz
) as $$
  with tsq as (
    select websearch_to_tsquery('english', coalesce(q, '')) as query
  )
  select 
    q.id as qa_id,
    q.folder_id,
    q.question,
    a.answer,
    ts_rank(
      setweight(to_tsvector('english', coalesce(q.question, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(a.answer, '')), 'B'),
      (select query from tsq)
    ) as rank,
    ts_headline('english', q.question, (select query from tsq), 'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=15') as snippet_question,
    case when a.answer is not null then ts_headline('english', a.answer, (select query from tsq), 'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30') end as snippet_answer,
    q.created_at,
    coalesce(a.updated_at, q.created_at) as updated_at
  from public.questions q
  left join public.answers a on a.question_id = q.id and a.is_current = true
  where q.user_id = auth.uid()
    and (folder is null or q.folder_id = folder)
    and (
      setweight(to_tsvector('english', coalesce(q.question, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(a.answer, '')), 'B')
    ) @@ (select query from tsq)
  order by rank desc, updated_at desc
  offset greatest(0, (page - 1)) * page_size
  limit page_size;
$$ language sql stable;

-- ========= Enhancements: tags, favorites, order, archive =========
-- Add columns if missing
alter table if exists public.questions add column if not exists tags text[] default '{}'::text[];
alter table if exists public.questions add column if not exists favorite boolean default false;
alter table if exists public.questions add column if not exists order_index integer default 0;
alter table if exists public.folders add column if not exists archived_at timestamptz;

-- Helpful indexes
create index if not exists questions_tags_idx on public.questions using gin (tags);
create index if not exists questions_favorite_idx on public.questions(favorite);
create index if not exists questions_order_idx on public.questions(folder_id, order_index desc);

