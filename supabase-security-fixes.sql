-- ============================================================================
-- Supabase Security Hardening Migration
-- Fixes all Security Advisor warnings for dd-search
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FIX: Function Search Path Mutable
-- Add SET search_path to all functions for security
-- ----------------------------------------------------------------------------

-- Fix: public.ivfflat_search_query
CREATE OR REPLACE FUNCTION public.ivfflat_search_query(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  content text,
  published_at date,
  url text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    posts.id,
    posts.title,
    posts.slug,
    posts.content,
    posts.published_at,
    posts.url,
    1 - (posts.embedding <=> query_embedding) AS similarity
  FROM posts
  WHERE 1 - (posts.embedding <=> query_embedding) > match_threshold
  ORDER BY posts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix: public.search_posts
CREATE OR REPLACE FUNCTION public.search_posts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  content text,
  published_at date,
  url text,
  similarity float
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    posts.id,
    posts.title,
    posts.slug,
    posts.content,
    posts.published_at,
    posts.url,
    1 - (posts.embedding <=> query_embedding) AS similarity
  FROM posts
  WHERE 1 - (posts.embedding <=> query_embedding) > match_threshold
  ORDER BY posts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix: public.upsert_post
CREATE OR REPLACE FUNCTION public.upsert_post(
  p_title text,
  p_slug text,
  p_content text,
  p_published_at date,
  p_url text,
  p_embedding vector(1536)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO posts (title, slug, content, published_at, url, embedding)
  VALUES (p_title, p_slug, p_content, p_published_at, p_url, p_embedding)
  ON CONFLICT (slug)
  DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    published_at = EXCLUDED.published_at,
    url = EXCLUDED.url,
    embedding = EXCLUDED.embedding,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. FIX: RLS Disabled in Public
-- Enable Row Level Security on posts and search_queries tables
-- ----------------------------------------------------------------------------

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (API access) - full access
CREATE POLICY "Service role has full access to posts"
ON public.posts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users - read only
CREATE POLICY "Authenticated users can read posts"
ON public.posts
FOR SELECT
TO authenticated
USING (true);

-- Create policy for anonymous users - read only (for public API)
CREATE POLICY "Anonymous users can read posts"
ON public.posts
FOR SELECT
TO anon
USING (true);

-- Enable RLS on search_queries table
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

-- Create policy for service role - full access
CREATE POLICY "Service role has full access to search_queries"
ON public.search_queries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for authenticated users - can only see their own queries
CREATE POLICY "Users can read their own search queries"
ON public.search_queries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Anonymous users should not be able to read search queries (privacy)
-- No policy needed - RLS will block by default

-- ----------------------------------------------------------------------------
-- 3. FIX: Security Definer Views
-- Review and recreate views with explicit search_path
-- ----------------------------------------------------------------------------

-- Drop and recreate search_analytics_daily view with security context
DROP VIEW IF EXISTS public.search_analytics_daily CASCADE;
CREATE VIEW public.search_analytics_daily
WITH (security_invoker = true)
AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_searches,
  COUNT(DISTINCT query) as unique_queries,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(ARRAY_LENGTH(results, 1)) as avg_results
FROM public.search_queries
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Drop and recreate popular_searches view with security context
DROP VIEW IF EXISTS public.popular_searches CASCADE;
CREATE VIEW public.popular_searches
WITH (security_invoker = true)
AS
SELECT
  query,
  COUNT(*) as search_count,
  MAX(created_at) as last_searched
FROM public.search_queries
GROUP BY query
ORDER BY search_count DESC, last_searched DESC
LIMIT 100;

-- Drop and recreate recent_searches view with security context
DROP VIEW IF EXISTS public.recent_searches CASCADE;
CREATE VIEW public.recent_searches
WITH (security_invoker = true)
AS
SELECT
  id,
  query,
  created_at,
  user_id
FROM public.search_queries
ORDER BY created_at DESC
LIMIT 100;

-- ----------------------------------------------------------------------------
-- 4. NOTE: Extension in Public (pgvector)
-- ----------------------------------------------------------------------------
-- Moving pgvector extension to a different schema after installation can
-- break existing vector columns and indexes. Since this is already in use,
-- we'll leave it in the public schema. This is a common practice and
-- relatively low risk for single-app databases.
--
-- If you want to move it anyway (advanced), you would need to:
-- 1. Create a new schema (e.g., 'extensions')
-- 2. Move the extension: ALTER EXTENSION vector SET SCHEMA extensions;
-- 3. Update all search_path references in functions
-- 4. Test thoroughly
--
-- For now, we're leaving this as-is since it's the standard configuration.
-- ----------------------------------------------------------------------------

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.posts TO anon, authenticated, service_role;
GRANT SELECT ON public.search_queries TO authenticated, service_role;
GRANT ALL ON public.search_queries TO service_role;
GRANT ALL ON public.posts TO service_role;

-- Grant access to views (respecting RLS on underlying tables)
GRANT SELECT ON public.search_analytics_daily TO authenticated, service_role;
GRANT SELECT ON public.popular_searches TO authenticated, service_role;
GRANT SELECT ON public.recent_searches TO authenticated, service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to verify fixes
-- ============================================================================

-- Verify RLS is enabled
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('posts', 'search_queries');

-- Verify policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- Verify function search_path
-- SELECT routine_name, routine_definition
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('ivfflat_search_query', 'search_posts', 'upsert_post');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
