-- Updated Supabase SQL schema for Tidy Mind (with notes table)

-- Enable Row Level Security
alter table if exists public.folders enable row level security;
alter table if exists public.notes enable row level security;

-- Folders: organization containers
create table if not exists public.folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  tags text[] default '{}',
  order_index integer default 0,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  archived_at timestamptz
);

-- Notes: combined questions and answers (renamed from questions/answers)
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  folder_id uuid references public.folders(id) on delete cascade not null,
  title text not null, -- renamed from question
  content text, -- renamed from answer
  tags text[] default '{}',
  favorite boolean default false,
  order_index integer default 0,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  embedding vector(384) -- for AI search
);

-- RLS Policies for folders
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

-- RLS Policies for notes
drop policy if exists "notes_read_own" on public.notes;
create policy "notes_read_own" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_all_using" on public.notes;
create policy "notes_all_using" on public.notes
  for all using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Indexes for better performance
create index if not exists folders_user_id_idx on public.folders(user_id);
create index if not exists folders_order_idx on public.folders(user_id, order_index desc);
create index if not exists notes_folder_id_idx on public.notes(folder_id);
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_tags_idx on public.notes using gin (tags);
create index if not exists notes_favorite_idx on public.notes(favorite);
create index if not exists notes_order_idx on public.notes(folder_id, order_index desc);
create index if not exists notes_embedding_idx on public.notes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers
drop trigger if exists folders_updated_at on public.folders;
create trigger folders_updated_at before update on public.folders
  for each row execute function public.handle_updated_at();

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes
  for each row execute function public.handle_updated_at();

-- Views for common queries
drop view if exists public.folders_with_stats;
create view public.folders_with_stats as
select 
  f.*,
  count(n.id) as question_count,
  count(case when n.content is not null and n.content != '' then 1 end) as answered_count
from public.folders f
left join public.notes n on n.folder_id = f.id
group by f.id;

create or replace view public.notes_view as
select 
  n.*,
  f.name as folder_name
from public.notes n
left join public.folders f on f.id = n.folder_id;

-- Full-text search support
create extension if not exists pg_trgm;
create index if not exists notes_fts_idx on public.notes using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- RPC: search across notes for the current user
drop function if exists public.search_notes(text, uuid, integer, integer);
create or replace function public.search_notes(
  q text,
  folder uuid default null,
  page integer default 1,
  page_size integer default 20
)
returns table (
  note_id uuid,
  folder_id uuid,
  title text,
  content text,
  rank real,
  snippet_title text,
  snippet_content text,
  created_at timestamptz,
  updated_at timestamptz
) as $$
  with tsq as (
    select websearch_to_tsquery('english', coalesce(q, '')) as query
  )
  select 
    n.id as note_id,
    n.folder_id,
    n.title,
    n.content,
    ts_rank(
      to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.content, '')),
      (select query from tsq)
    ) as rank,
    ts_headline('english', n.title, (select query from tsq), 'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=15') as snippet_title,
    case when n.content is not null then ts_headline('english', n.content, (select query from tsq), 'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=30') end as snippet_content,
    n.created_at,
    n.updated_at
  from public.notes n
  where n.user_id = auth.uid()
    and (folder is null or n.folder_id = folder)
    and to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.content, '')) @@ (select query from tsq)
  order by rank desc, updated_at desc
  offset greatest(0, (page - 1)) * page_size
  limit page_size;
$$ language sql stable;

-- RPC: vector search for AI-powered semantic search
drop function if exists public.match_notes(vector, float, int);
create or replace function public.match_notes (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  similarity float,
  folder_id uuid
)
language sql stable
as $$
  SELECT 
    n.id,
    n.title,
    n.content,
    1 - (n.embedding <=> query_embedding) as similarity,
    n.folder_id
  FROM notes AS n
  WHERE n.embedding IS NOT NULL
    AND n.user_id = auth.uid()
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- RPC: get all tags with counts
drop function if exists public.get_all_tags_with_counts();
create or replace function public.get_all_tags_with_counts()
returns table (
  tag text,
  note_count bigint
)
language sql stable
as $$
  SELECT 
    unnest(tags) as tag,
    count(*) as note_count
  FROM notes
  WHERE user_id = auth.uid()
  GROUP BY tag
  ORDER BY note_count DESC, tag;
$$;

-- RPC: get notes by tag
drop function if exists public.get_notes_by_tag(text);
create or replace function public.get_notes_by_tag(tag_name text)
returns table (
  id uuid,
  title text,
  folder_id uuid,
  folder_name text
)
language sql stable
as $$
  SELECT 
    n.id,
    n.title,
    n.folder_id,
    f.name as folder_name
  FROM notes n
  LEFT JOIN folders f ON f.id = n.folder_id
  WHERE n.user_id = auth.uid()
    AND tag_name = ANY(n.tags)
  ORDER BY n.updated_at DESC;
$$;

-- RPC: get backlinks for a note
drop function if exists public.get_backlinks(uuid);
create or replace function public.get_backlinks(note_id_param uuid)
returns table (
  id uuid,
  title text,
  folder_id uuid,
  folder_name text
)
language sql stable
as $$
  SELECT 
    n.id,
    n.title,
    n.folder_id,
    f.name as folder_name
  FROM notes n
  LEFT JOIN folders f ON f.id = n.folder_id
  WHERE n.user_id = auth.uid()
    AND n.content LIKE '%' || (SELECT title FROM notes WHERE id = note_id_param) || '%'
    AND n.id != note_id_param
  ORDER BY n.updated_at DESC;
$$;
