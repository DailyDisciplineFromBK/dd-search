-- Daily Discipline Search Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable pgvector extension
create extension if not exists vector;

-- Posts table
create table posts (
  id bigserial primary key,
  title text not null,
  slug text unique not null,
  content text not null,
  published_at date not null,
  url text not null,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Vector similarity search index
create index on posts using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Date index
create index on posts (published_at desc);

-- Full text search (backup)
alter table posts add column fts tsvector
  generated always as (to_tsvector('english', title || ' ' || content)) stored;
create index on posts using gin (fts);

-- Search function
create or replace function search_posts(
  query_embedding vector(1536),
  match_count int default 10,
  match_threshold float default 0.5
)
returns table (
  id bigint,
  title text,
  slug text,
  content text,
  published_at date,
  url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    posts.id,
    posts.title,
    posts.slug,
    posts.content,
    posts.published_at,
    posts.url,
    1 - (posts.embedding <=> query_embedding) as similarity
  from posts
  where 1 - (posts.embedding <=> query_embedding) > match_threshold
  order by posts.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Upsert function (for sync)
create or replace function upsert_post(
  p_title text,
  p_slug text,
  p_content text,
  p_published_at date,
  p_url text,
  p_embedding vector(1536)
)
returns bigint
language plpgsql
as $$
declare
  result_id bigint;
begin
  insert into posts (title, slug, content, published_at, url, embedding)
  values (p_title, p_slug, p_content, p_published_at, p_url, p_embedding)
  on conflict (slug) do update set
    title = excluded.title,
    content = excluded.content,
    published_at = excluded.published_at,
    url = excluded.url,
    embedding = excluded.embedding,
    updated_at = now()
  returning id into result_id;

  return result_id;
end;
$$;
