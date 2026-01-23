#!/usr/bin/env node
/**
 * Daily Discipline Search API - OPTIMIZED VERSION
 * Performance improvements: parallel execution, caching, streaming
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors({
  origin: [
    'https://www.dailydiscipline.com',
    'https://dailydiscipline.com',
    'http://localhost:3001'
  ]
}));
app.use(express.json());

// OPTIMIZATION 1: In-memory embedding cache (simple LRU)
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * Generate embedding with caching
 */
async function generateEmbedding(text) {
  // Check cache first
  if (embeddingCache.has(text)) {
    console.log(`  Cache hit: "${text.slice(0, 50)}..."`);
    return embeddingCache.get(text);
  }

  // Generate new embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const embedding = response.data[0].embedding;

  // Add to cache (simple LRU: delete oldest if full)
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  embeddingCache.set(text, embedding);

  return embedding;
}

/**
 * Search posts using vector similarity
 */
async function searchPosts(queryEmbedding, matchCount = 10, threshold = 0.35) {
  const { data, error } = await supabase.rpc('search_posts', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: threshold,
  });

  if (error) {
    throw new Error(`Search error: ${error.message}`);
  }

  return data || [];
}

/**
 * Use Claude to expand query - OPTIMIZED: Reduced to 3 queries
 */
async function expandQuery(query) {
  const prompt = `You are an expert on Daily Discipline, a platform with 2,100+ posts about discipline, habits, mindset, performance, and personal growth.

A user is searching for: "${query}"

Think deeply about what Daily Discipline concepts, topics, and themes would be MOST relevant to this query. Daily Discipline covers topics like:
- Building discipline and consistency
- Overcoming procrastination and resistance
- Mindset and mental frameworks
- Habit formation and behavior change
- Long-term thinking and patience
- Self-doubt and confidence
- Taking action despite fear
- Mastery and deliberate practice
- Identity and self-perception
- Focus and attention management

Generate EXACTLY 3 search queries that would find the most relevant Daily Discipline content. Think about the underlying principles, not just literal matches.

For example:
- "how to lose weight" → queries about discipline, consistency, long-term thinking
- "starting a business" → queries about taking action, overcoming fear, staying consistent
- "waking up early" → queries about discipline, habits, mindset

Respond ONLY with valid JSON:
{
  "queries": ["query 1", "query 2", "query 3"]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  let responseText = message.content[0].text;
  responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const expansion = JSON.parse(responseText);
    return expansion.queries.slice(0, 3); // Ensure exactly 3
  } catch (err) {
    console.error('Failed to parse query expansion:', responseText);
    // Fallback: just use original query
    return [query];
  }
}

/**
 * Generate direct answer in BK's voice
 */
async function generateDirectAnswer(query, posts) {
  const formattedPosts = posts.slice(0, 10)
    .map((post) => {
      return `"${post.title}" (${post.published_at})
${post.content.slice(0, 300)}...`;
    })
    .join('\n\n');

  const prompt = `You are BK from Daily Discipline. You've spent 8 years writing 2,100+ posts about discipline, habits, mindset, and performance. Your voice is direct, honest, simple. You write like you speak to one person. You activate emotion over information. You make things feel real, not just understood.

CORE PRINCIPLES:
- Truth with love (direct but never harsh, caring but never coddling)
- Simple, systematic, timeless
- Make readers FEEL concepts through visceral language
- Authority without arrogance (you're WITH readers, not above them)
- Short sentences. Varied rhythm. Punch, punch, sing.
- No em dashes. No semicolons. No clichés.
- Focus on what to DO, not just what to know

A user asked: "${query}"

Here are relevant Daily Discipline posts:

${formattedPosts}

Your task: Answer their question directly in 2-3 short paragraphs (150-250 words). Write as if speaking to one person who needs real help. Make them FEEL it. Be specific about what to do.

Key rules:
1. Address the ROOT issue (usually discipline, not the surface problem)
2. Tell them what to DO starting today
3. Make it simple. Make it real. Make them feel it.
4. Use "you" directly. Short sentences. Varied rhythm.
5. No fluff. No theory. Just truth they can act on.

Respond ONLY with the answer text (no JSON, no formatting).`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return message.content[0].text.trim();
}

/**
 * Synthesize results with Claude using extended thinking - OPTIMIZED
 */
async function synthesizeResults(originalQuery, expandedQueries, posts) {
  // Format posts for Claude - reduced content length
  const formattedPosts = posts
    .map((post, idx) => {
      return `${idx + 1}. "${post.title}" (${post.published_at})
Similarity: ${(post.similarity * 100).toFixed(1)}%
Content: ${post.content.slice(0, 350)}...`;
    })
    .join('\n\n');

  const prompt = `You are an expert on Daily Discipline, a platform about building discipline, habits, mindset, and elite performance. You deeply understand how Daily Discipline principles apply to all areas of life.

ORIGINAL USER QUERY: "${originalQuery}"

EXPANDED SEARCH QUERIES: ${expandedQueries.join(', ')}

SEARCH RESULTS:

${formattedPosts}

Your task: Analyze these posts and select the 5-7 most relevant ones for the user's original query. Think deeply about:
1. How Daily Discipline principles apply to their specific situation
2. What foundational mindsets or behaviors they need to develop
3. Which posts will give them the most actionable and transformative insights

Be generous in your interpretation - if the user asks about weight loss, posts about discipline, consistency, long-term thinking, and overcoming resistance are ALL highly relevant, even if they don't mention "weight" at all.

Respond ONLY with valid JSON:
{
  "top_posts": [
    {
      "index": 1,
      "relevance": "One sentence explaining specifically how this post's principles apply to the user's query"
    }
  ]
}

Select 5-7 posts. Prioritize posts that give the user foundational understanding and actionable frameworks.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Parse Claude's response
  let responseText = message.content[0].text;
  responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const synthesis = JSON.parse(responseText);
    return synthesis;
  } catch (err) {
    console.error('Failed to parse Claude response:', responseText);
    throw new Error('Invalid response from synthesis');
  }
}

/**
 * POST /search - OPTIMIZED VERSION
 * Main search endpoint with parallel execution
 */
app.post('/search', async (req, res) => {
  const startTime = Date.now();

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter required',
      });
    }

    console.log(`\n🔍 Search query: "${query}"`);

    // Step 1: Expand query using Claude (3 queries instead of 5)
    console.log('⚡ Expanding query...');
    const expandStart = Date.now();
    const expandedQueries = await expandQuery(query);
    console.log(`✓ Expanded in ${Date.now() - expandStart}ms:`, expandedQueries);

    // OPTIMIZATION 2: Parallel embedding generation + search
    console.log('⚡ Parallel search...');
    const searchStart = Date.now();

    const searchPromises = expandedQueries.map(async (expandedQuery) => {
      const embedding = await generateEmbedding(expandedQuery);
      return searchPosts(embedding, 12); // Slightly reduced from 15
    });

    const resultsArrays = await Promise.all(searchPromises);
    console.log(`✓ Searched in ${Date.now() - searchStart}ms`);

    // Deduplicate and merge results
    const allPosts = new Map();
    for (const posts of resultsArrays) {
      for (const post of posts) {
        if (!allPosts.has(post.slug) || post.similarity > allPosts.get(post.slug).similarity) {
          allPosts.set(post.slug, post);
        }
      }
    }

    const posts = Array.from(allPosts.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20); // Reduced from 25

    if (posts.length === 0) {
      await supabase.rpc('log_search_query', {
        p_query: query,
        p_expanded_queries: expandedQueries,
        p_results_count: 0,
        p_search_time_ms: Date.now() - startTime,
      });

      return res.json({
        answer: "Can't find specific posts for that. Try searching for discipline, habits, or mindset concepts related to your question.",
        results: [],
      });
    }

    console.log(`✓ Found ${posts.length} unique results`);

    // OPTIMIZATION 3: Parallel answer generation + synthesis
    console.log('⚡ Parallel generation...');
    const genStart = Date.now();

    const [answer, synthesis] = await Promise.all([
      generateDirectAnswer(query, posts),
      synthesizeResults(query, expandedQueries, posts)
    ]);

    console.log(`✓ Generated in ${Date.now() - genStart}ms`);

    // Build response
    const topResults = synthesis.top_posts.map((item) => {
      const post = posts[item.index - 1];
      return {
        title: post.title,
        slug: post.slug,
        content: post.content.slice(0, 300) + '...',
        published_at: post.published_at,
        url: post.url,
        relevance: item.relevance,
      };
    });

    const searchTime = Date.now() - startTime;
    console.log(`✅ Search complete in ${searchTime}ms!`);

    // Log search query
    await supabase.rpc('log_search_query', {
      p_query: query,
      p_expanded_queries: expandedQueries,
      p_results_count: topResults.length,
      p_search_time_ms: searchTime,
    });

    res.json({
      answer: answer,
      results: topResults,
    });
  } catch (err) {
    console.error('❌ Search error:', err);
    res.status(500).json({
      error: 'Search failed',
      message: err.message,
    });
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache_size: embeddingCache.size,
  });
});

/**
 * GET /
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Daily Discipline Search API (Optimized)',
    version: '2.0.0',
    endpoints: {
      'POST /search': 'Search posts with natural language query',
      'GET /health': 'Health check',
    },
    optimizations: [
      'Parallel embedding generation',
      'Parallel answer + synthesis',
      'In-memory embedding cache',
      'Reduced query expansion (3 instead of 5)',
      'Reduced result set (20 instead of 25)'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('Daily Discipline Search API (OPTIMIZED)');
  console.log('=======================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nOptimizations enabled:`);
  console.log(`  ✓ Parallel embeddings + search`);
  console.log(`  ✓ Parallel answer + synthesis`);
  console.log(`  ✓ Embedding cache (${MAX_CACHE_SIZE} items)`);
  console.log(`  ✓ Reduced query expansion`);
  console.log(`\nReady to accept queries!\n`);
});
