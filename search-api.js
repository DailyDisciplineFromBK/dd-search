#!/usr/bin/env node
/**
 * Daily Discipline Search API
 * Semantic search powered by OpenAI embeddings + Claude synthesis
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
app.use(cors());
app.use(express.json());

/**
 * Generate embedding for query
 */
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
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
 * Use Claude to expand query and understand what Daily Discipline concepts are relevant
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

Generate 3-5 search queries that would find the most relevant Daily Discipline content. Think about the underlying principles, not just literal matches.

For example:
- "how to lose weight" → queries about discipline, consistency, long-term thinking, overcoming resistance, habit formation
- "starting a business" → queries about taking action, overcoming fear, building confidence, staying consistent
- "waking up early" → queries about discipline, habits, mindset, resistance, identity

Respond ONLY with valid JSON:
{
  "queries": ["query 1", "query 2", "query 3", "query 4", "query 5"]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
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
    return expansion.queries;
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
 * Synthesize results with Claude using extended thinking
 */
async function synthesizeResults(originalQuery, expandedQueries, posts) {
  // Format posts for Claude
  const formattedPosts = posts
    .map((post, idx) => {
      return `${idx + 1}. "${post.title}" (${post.published_at})
Similarity: ${(post.similarity * 100).toFixed(1)}%
Content: ${post.content.slice(0, 500)}...
URL: ${post.url}`;
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
  "summary": "2-3 sentence summary explaining how these Daily Discipline posts address the user's query, connecting the dots between their question and the principles in these posts",
  "top_posts": [
    {
      "index": 1,
      "relevance": "One sentence explaining specifically how this post's principles apply to the user's query"
    }
  ]
}

Select 5-7 posts (not just 5). Prioritize posts that give the user foundational understanding and actionable frameworks.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
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
 * POST /search
 * Main search endpoint with intelligent query expansion
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

    console.log(`\nSearch query: "${query}"`);

    // Step 1: Expand query using Claude to understand Daily Discipline relevance
    console.log('Expanding query with Claude...');
    const expandedQueries = await expandQuery(query);
    console.log(`Expanded to ${expandedQueries.length} queries:`, expandedQueries);

    // Step 2: Search for each expanded query
    console.log('Searching posts...');
    const allPosts = new Map(); // Use Map to deduplicate by slug

    for (const expandedQuery of expandedQueries) {
      const embedding = await generateEmbedding(expandedQuery);
      const posts = await searchPosts(embedding, 15); // Get more results per query

      // Add posts to map (deduplicates automatically)
      for (const post of posts) {
        if (!allPosts.has(post.slug) || post.similarity > allPosts.get(post.slug).similarity) {
          allPosts.set(post.slug, post);
        }
      }
    }

    // Convert map to array and sort by similarity
    const posts = Array.from(allPosts.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 25); // Take top 25 for Claude to analyze

    if (posts.length === 0) {
      // Log search with no results
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

    console.log(`Found ${posts.length} unique results`);

    // Step 3: Generate direct answer in BK's voice
    console.log('Generating direct answer...');
    const answer = await generateDirectAnswer(query, posts);

    // Step 4: Synthesize posts with Claude (with full context)
    console.log('Synthesizing with Claude...');
    const synthesis = await synthesizeResults(query, expandedQueries, posts);

    // Step 5: Build response (remove similarity from user-facing results)
    const topResults = synthesis.top_posts.map((item) => {
      const post = posts[item.index - 1]; // Convert 1-based to 0-based index
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
    console.log(`Search complete in ${searchTime}ms!`);

    // Step 6: Log search query
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
    console.error('Search error:', err);
    res.status(500).json({
      error: 'Search failed',
      message: err.message,
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /
 * API info
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Daily Discipline Search API',
    version: '1.0.0',
    endpoints: {
      'POST /search': 'Search posts with natural language query',
      'GET /health': 'Health check',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log('Daily Discipline Search API');
  console.log('===========================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST http://localhost:${PORT}/search`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`\nReady to accept queries!\n`);
});
