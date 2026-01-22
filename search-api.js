#!/usr/bin/env node
/**
 * Daily Discipline Search API
 * Semantic search powered by OpenAI embeddings + Anthropic synthesis
 */

import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/**
 * ENV + CONFIG
 */
const PORT = Number(process.env.PORT || 3000);

// Optional: restrict CORS for production (recommended).
// Example Railway var:
// CORS_ORIGINS=https://www.medishare.com,https://app.hubspot.com
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// OpenAI embeddings model
const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

// Anthropic model (set this to a model you actually have access to)
// Example: ANTHROPIC_MODEL=claude-3-5-sonnet-latest
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

// Limits
const MAX_QUERY_CHARS = Number(process.env.MAX_QUERY_CHARS || 500);
const MAX_EXPANDED_QUERIES = Number(process.env.MAX_EXPANDED_QUERIES || 5);
const POSTS_PER_EXPANDED_QUERY = Number(process.env.POSTS_PER_EXPANDED_QUERY || 15);
const POSTS_FOR_SYNTHESIS = Number(process.env.POSTS_FOR_SYNTHESIS || 25);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

/**
 * Initialize clients (fail fast if misconfigured)
 */
requireEnv("SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY);
requireEnv("OPENAI_API_KEY", OPENAI_API_KEY);
requireEnv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

/**
 * Middleware
 */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, server-to-server) where origin is undefined
      if (!origin) return callback(null, true);

      // If not configured, allow all (dev-friendly)
      if (CORS_ORIGINS.length === 0) return callback(null, true);

      // Otherwise only allow listed origins
      if (CORS_ORIGINS.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

/**
 * Helpers
 */
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text,
  });
  return response.data?.[0]?.embedding;
}

async function searchPosts(queryEmbedding, matchCount = 10, threshold = 0.35) {
  const { data, error } = await supabase.rpc("search_posts", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: threshold,
  });

  if (error) {
    throw new Error(`Supabase search_posts RPC error: ${error.message}`);
  }
  return data || [];
}

/**
 * Expand query with Anthropic (returns array of queries)
 */
async function expandQuery(query) {
  const prompt = `You are an expert on Daily Discipline, a platform with 2,100+ posts about discipline, habits, mindset, performance, and personal growth.

A user is searching for: "${query}"

Generate 3-5 alternative search queries that would find the most relevant Daily Discipline content.
Focus on underlying principles, not literal terms.

Respond ONLY with valid JSON:
{"queries":["query 1","query 2","query 3"]}`;

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  let responseText = message.content?.[0]?.text || "";
  responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(responseText);
    const queries = Array.isArray(parsed.queries) ? parsed.queries : [];
    // sanitize
    const clean = queries
      .map((q) => String(q || "").trim())
      .filter(Boolean)
      .slice(0, MAX_EXPANDED_QUERIES);

    return clean.length ? clean : [query];
  } catch {
    return [query];
  }
}

/**
 * Generate direct answer in BK voice
 */
async function generateDirectAnswer(query, posts) {
  const formattedPosts = posts
    .slice(0, 10)
    .map((post) => `"${post.title}" (${post.published_at})\n${String(post.content || "").slice(0, 300)}...`)
    .join("\n\n");

  const prompt = `You are BK from Daily Discipline. Write direct, simple, honest.

User asked: "${query}"

Relevant posts:
${formattedPosts}

Answer in 2-3 short paragraphs (150-250 words).
No em dashes. No semicolons. No fluff. Tell them what to do today.
Respond ONLY with the answer text.`;

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 450,
    messages: [{ role: "user", content: prompt }],
  });

  return (message.content?.[0]?.text || "").trim();
}

/**
 * Synthesize top posts
 */
async function synthesizeResults(originalQuery, expandedQueries, posts) {
  const formattedPosts = posts
    .map((post, idx) => {
      const similarityPct = post.similarity != null ? `${(post.similarity * 100).toFixed(1)}%` : "n/a";
      return `${idx + 1}. "${post.title}" (${post.published_at})
Similarity: ${similarityPct}
Content: ${String(post.content || "").slice(0, 500)}...
URL: ${post.url}`;
    })
    .join("\n\n");

  const prompt = `You are an expert on Daily Discipline.

ORIGINAL QUERY: "${originalQuery}"
EXPANDED QUERIES: ${expandedQueries.join(", ")}

RESULTS:
${formattedPosts}

Pick the 5-7 most relevant posts.
Respond ONLY with valid JSON:
{
  "summary": "2-3 sentences",
  "top_posts": [{"index": 1, "relevance": "one sentence"}]
}`;

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  let responseText = message.content?.[0]?.text || "";
  responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(responseText);
    if (!Array.isArray(parsed.top_posts)) throw new Error("top_posts missing");
    return parsed;
  } catch (e) {
    throw new Error(`Invalid synthesis JSON from Anthropic: ${e.message}`);
  }
}

/**
 * Routes
 */
app.post("/search", async (req, res) => {
  const startTime = Date.now();

  try {
    const query = req.body?.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query parameter required" });
    }

    const q = query.trim();
    if (!q) return res.status(400).json({ error: "Query cannot be empty" });
    if (q.length > MAX_QUERY_CHARS) {
      return res.status(400).json({ error: `Query too long (max ${MAX_QUERY_CHARS} chars)` });
    }

    console.log(`Search: "${q}"`);

    // 1) Expand query
    const expandedQueries = await expandQuery(q);
    console.log("Expanded:", expandedQueries);

    // 2) Search each expanded query
    const allPosts = new Map();

    for (const expanded of expandedQueries) {
      const embedding = await generateEmbedding(expanded);
      if (!embedding) continue;

      const posts = await searchPosts(embedding, POSTS_PER_EXPANDED_QUERY);

      for (const post of posts) {
        const key = post.slug || post.url || post.title;
        if (!key) continue;

        if (!allPosts.has(key) || (post.similarity || 0) > (allPosts.get(key).similarity || 0)) {
          allPosts.set(key, post);
        }
      }
    }

    const posts = Array.from(allPosts.values())
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, POSTS_FOR_SYNTHESIS);

    if (posts.length === 0) {
      // Optional: log query if your RPC exists
      try {
        await supabase.rpc("log_search_query", {
          p_query: q,
          p_expanded_queries: expandedQueries,
          p_results_count: 0,
          p_search_time_ms: Date.now() - startTime,
        });
      } catch {}

      return res.json({
        answer: "I couldn't find a close match. Try searching for the underlying discipline or mindset behind your question.",
        results: [],
      });
    }

    // 3) Answer
    const answer = await generateDirectAnswer(q, posts);

    // 4) Synthesize top posts
    const synthesis = await synthesizeResults(q, expandedQueries, posts);

    // 5) Build response
    const topResults = (synthesis.top_posts || [])
      .slice(0, 7)
      .map((item) => {
        const idx = Number(item.index) - 1;
        const post = posts[idx];
        if (!post) return null;

        return {
          title: post.title,
          slug: post.slug,
          content: String(post.content || "").slice(0, 300) + "...",
          published_at: post.published_at,
          url: post.url,
          relevance: item.relevance,
        };
      })
      .filter(Boolean);

    const searchTime = Date.now() - startTime;

    // Optional: log query if your RPC exists
    try {
      await supabase.rpc("log_search_query", {
        p_query: q,
        p_expanded_queries: expandedQueries,
        p_results_count: topResults.length,
        p_search_time_ms: searchTime,
      });
    } catch {}

    return res.json({
      answer,
      summary: synthesis.summary,
      results: topResults,
      meta: {
        expanded_queries: expandedQueries,
        ms: searchTime,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({
      error: "Search failed",
      message: err.message,
    });
  }
});

app.get("/health", async (req, res) => {
  // Basic env diagnostics (safe)
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
      hasOpenAIKey: !!OPENAI_API_KEY,
      hasAnthropicKey: !!ANTHROPIC_API_KEY,
      anthropicModel: ANTHROPIC_MODEL,
      openaiEmbeddingModel: OPENAI_EMBEDDING_MODEL,
      corsRestricted: CORS_ORIGINS.length > 0,
    },
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "Daily Discipline Search API",
    version: "1.0.0",
    endpoints: {
      "POST /search": "Search posts with natural language query",
      "GET /health": "Health check",
    },
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  // On Railway, you’ll see a random public domain + HTTPS. Internally it binds to PORT.
  console.log("Daily Discipline Search API");
  console.log("===========================");
  console.log(`Listening on port ${PORT}`);
  console.log("Ready.");
});
