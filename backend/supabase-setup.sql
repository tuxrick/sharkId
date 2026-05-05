-- Run this once in the Supabase SQL editor before ingesting

create extension if not exists vector;

create table if not exists shark_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536)
);

create index if not exists shark_knowledge_embedding_idx
  on shark_knowledge using ivfflat (embedding vector_cosine_ops);

-- RPC used by identify.ts for similarity search
create or replace function match_shark_knowledge(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from shark_knowledge
  order by embedding <=> query_embedding
  limit match_count;
$$;
