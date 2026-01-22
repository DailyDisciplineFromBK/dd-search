-- Search Query Logging Migration
-- Run this in Supabase SQL Editor to add search query logging

-- Search queries table
create table if not exists search_queries (
  id bigserial primary key,
  query text not null,
  expanded_queries jsonb,
  results_count int,
  search_time_ms int,
  user_agent text,
  ip_address inet,
  created_at timestamptz default now()
);

-- Index for analytics
create index if not exists idx_search_queries_created_at on search_queries (created_at desc);
create index if not exists idx_search_queries_query on search_queries (query);

-- Function to log search
create or replace function log_search_query(
  p_query text,
  p_expanded_queries jsonb default null,
  p_results_count int default 0,
  p_search_time_ms int default 0,
  p_user_agent text default null,
  p_ip_address inet default null
)
returns bigint
language plpgsql
as $$
declare
  result_id bigint;
begin
  insert into search_queries (
    query,
    expanded_queries,
    results_count,
    search_time_ms,
    user_agent,
    ip_address
  )
  values (
    p_query,
    p_expanded_queries,
    p_results_count,
    p_search_time_ms,
    p_user_agent,
    p_ip_address
  )
  returning id into result_id;

  return result_id;
end;
$$;

-- View for popular searches
create or replace view popular_searches as
select
  query,
  count(*) as search_count,
  avg(results_count) as avg_results,
  avg(search_time_ms) as avg_time_ms,
  max(created_at) as last_searched
from search_queries
group by query
order by count(*) desc
limit 100;

-- View for recent searches
create or replace view recent_searches as
select
  id,
  query,
  results_count,
  search_time_ms,
  created_at
from search_queries
order by created_at desc
limit 100;

-- View for search analytics by day
create or replace view search_analytics_daily as
select
  date_trunc('day', created_at) as day,
  count(*) as total_searches,
  count(distinct query) as unique_queries,
  avg(results_count) as avg_results,
  avg(search_time_ms) as avg_time_ms
from search_queries
group by date_trunc('day', created_at)
order by day desc;
