#!/usr/bin/env node
/**
 * Daily Discipline Search API - STREAMING VERSION
 * Real-time results like ChatGPT - shows answer as it's generated
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { detectIntent, checkRestrictions, checkKnowledgeFacts, buildAnswerPrompt } from './knowledge-base.js';
import { submitHubSpotForm, submitEmailSubscription, submitContactForm, submitKeynoteInquiry } from './hubspot-forms.js';

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

// Middleware - More permissive CORS for debugging
app.use(cors({
  origin: true, // Allow all origins for now
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} from ${req.headers.origin || 'unknown'}`);
  next();
});

// In-memory embedding cache
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 100;

/**
 * Generate embedding with caching
 */
async function generateEmbedding(text) {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text);
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const embedding = response.data[0].embedding;

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
 * Expand query - reduced to 3 queries
 */
async function expandQuery(query) {
  const prompt = `You are an expert on Daily Discipline. Generate EXACTLY 3 search queries for: "${query}"

Respond ONLY with valid JSON:
{"queries": ["query 1", "query 2", "query 3"]}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  let responseText = message.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const expansion = JSON.parse(responseText);
    return expansion.queries.slice(0, 3);
  } catch (err) {
    return [query];
  }
}

/**
 * POST /search/stream - STREAMING VERSION
 * Returns Server-Sent Events for real-time updates
 */
app.post('/search/stream', async (req, res) => {
  const startTime = Date.now();
  console.log('🔍 Stream search request received:', req.body);

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      console.log('❌ Invalid query:', req.body);
      sendEvent('error', { message: 'Query parameter required' });
      res.end();
      return;
    }

    console.log(`🔍 Search query: "${query}"`);

    // Step 0: Intent detection and knowledge base check
    sendEvent('status', { message: 'Understanding your question...' });

    const intent = detectIntent(query);
    const restrictions = checkRestrictions(query);
    const knowledgeFact = checkKnowledgeFacts(query);

    console.log('Intent detected:', intent?.type || 'none');
    console.log('Restrictions:', restrictions.restricted ? restrictions.term : 'none');
    console.log('Knowledge fact:', knowledgeFact?.type || 'none');

    // Handle special intent cases (forms, redirects, etc.)
    if (intent && (intent.action === 'hubspot_form' || intent.action === 'redirect')) {
      sendEvent('intent_detected', {
        intentType: intent.type,
        action: intent.action,
        formId: intent.formId,
        url: intent.url,
        response: intent.response,
        requiredFields: intent.requiredFields,
        successUrl: intent.successUrl,
        celebratory: intent.celebratory || false
      });

      // Still do a quick search to provide context (but won't show posts if celebratory)
      if (!intent.celebratory) {
        sendEvent('status', { message: 'Finding relevant content...' });
      }
    }

    // Step 1: Query expansion
    const expandedQueries = await expandQuery(query);
    sendEvent('expanded', { queries: expandedQueries });

    // Step 2: Parallel search
    sendEvent('status', { message: 'Searching 2,100+ posts...' });

    const searchPromises = expandedQueries.map(async (expandedQuery) => {
      const embedding = await generateEmbedding(expandedQuery);
      return searchPosts(embedding, 12);
    });

    const resultsArrays = await Promise.all(searchPromises);

    // Deduplicate
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
      .slice(0, 20);

    if (posts.length === 0) {
      sendEvent('answer', {
        answer: "Can't find specific posts for that. Try searching for discipline, habits, or mindset concepts."
      });
      sendEvent('complete', { searchTime: Date.now() - startTime });
      res.end();
      return;
    }

    sendEvent('posts_found', { count: posts.length });

    // Step 3: Stream BK's answer with Claude streaming
    sendEvent('status', { message: 'BK is responding...' });

    // Build answer prompt with knowledge base enhancements
    const answerPrompt = buildAnswerPrompt(query, posts, intent, restrictions, knowledgeFact);

    // Stream answer from Claude
    const answerStream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 400,
      messages: [{ role: 'user', content: answerPrompt }],
    });

    let fullAnswer = '';
    for await (const chunk of answerStream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text;
        fullAnswer += text;
        sendEvent('answer_chunk', { text });
      }
    }

    sendEvent('answer_complete', { answer: fullAnswer });

    // Step 4: Synthesize posts (non-streaming, but quick)
    sendEvent('status', { message: 'Finding the best posts...' });

    const synthesisPrompt = `Select 5-7 most relevant posts for: "${query}"

Posts:
${posts.map((p, i) => `${i + 1}. "${p.title}" ${(p.similarity * 100).toFixed(1)}%`).join('\n')}

JSON only:
{"top_posts": [{"index": 1, "relevance": "why relevant"}]}`;

    const synthesisMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    let synthesisText = synthesisMsg.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const synthesis = JSON.parse(synthesisText);

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

    sendEvent('results', { posts: topResults });

    // Complete
    const searchTime = Date.now() - startTime;
    sendEvent('complete', { searchTime });

    // Log search
    await supabase.rpc('log_search_query', {
      p_query: query,
      p_expanded_queries: expandedQueries,
      p_results_count: topResults.length,
      p_search_time_ms: searchTime,
    });

    res.end();

  } catch (err) {
    console.error('❌ Search error:', err);
    sendEvent('error', { message: err.message });
    res.end();
  }
});

/**
 * POST /search - Non-streaming fallback (original optimized version)
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

    // Expand query (3 queries)
    const expandedQueries = await expandQuery(query);

    // Parallel search
    const searchPromises = expandedQueries.map(async (expandedQuery) => {
      const embedding = await generateEmbedding(expandedQuery);
      return searchPosts(embedding, 12);
    });

    const resultsArrays = await Promise.all(searchPromises);

    // Deduplicate
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
      .slice(0, 20);

    if (posts.length === 0) {
      return res.json({
        answer: "Can't find specific posts for that. Try searching for discipline, habits, or mindset concepts.",
        results: [],
      });
    }

    // Parallel answer + synthesis
    const formattedPosts = posts.slice(0, 10)
      .map((post) => `"${post.title}"\n${post.content.slice(0, 300)}...`)
      .join('\n\n');

    const answerPrompt = `You are BK from Daily Discipline. Answer directly in 2-3 paragraphs: "${query}"
Posts: ${formattedPosts}
Be direct, actionable, simple.`;

    const synthesisPrompt = `Select 5-7 most relevant posts for: "${query}"
Posts:
${posts.map((p, i) => `${i + 1}. "${p.title}"`).join('\n')}
JSON: {"top_posts": [{"index": 1, "relevance": "why"}]}`;

    const [answerMsg, synthesisMsg] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 400,
        messages: [{ role: 'user', content: answerPrompt }],
      }),
      anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        messages: [{ role: 'user', content: synthesisPrompt }],
      })
    ]);

    const answer = answerMsg.content[0].text.trim();
    let synthesisText = synthesisMsg.content[0].text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const synthesis = JSON.parse(synthesisText);

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
 * POST /submit-form - HubSpot form submission
 */
app.post('/submit-form', async (req, res) => {
  try {
    const { formId, fields, context } = req.body;

    if (!formId || !fields) {
      return res.status(400).json({
        error: 'formId and fields are required'
      });
    }

    console.log(`📝 Form submission: ${formId}`, fields);

    const result = await submitHubSpotForm(formId, fields, context);

    if (result.success) {
      res.json({
        success: true,
        message: 'Form submitted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Form submission failed',
        message: result.error
      });
    }

  } catch (err) {
    console.error('❌ Form submission error:', err);
    res.status(500).json({
      error: 'Form submission failed',
      message: err.message
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
    version: '3.0.0-streaming',
  });
});

/**
 * GET /
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Daily Discipline Search API (Streaming)',
    version: '3.0.0',
    endpoints: {
      'POST /search/stream': 'Streaming search with real-time updates (SSE)',
      'POST /search': 'Standard search (optimized, non-streaming)',
      'GET /health': 'Health check',
    },
    features: [
      'Real-time answer streaming',
      'Parallel embeddings + search',
      'In-memory embedding cache',
      'Optimized performance',
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('Daily Discipline Search API (STREAMING)');
  console.log('========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /search/stream - Real-time streaming`);
  console.log(`  POST /search - Standard optimized`);
  console.log(`\nFeatures:`);
  console.log(`  ✓ Real-time answer streaming`);
  console.log(`  ✓ Parallel execution`);
  console.log(`  ✓ Embedding cache`);
  console.log(`\nReady to accept queries!\n`);
});
