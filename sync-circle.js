#!/usr/bin/env node
/**
 * Daily sync script to fetch new posts from Circle.so
 * Usage: node sync-circle.js
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract text from Circle.so tiptap body
 */
function extractTextFromTiptap(tiptapBody) {
  if (!tiptapBody) return '';

  const lines = [];

  function processNode(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'text') {
      return node.text || '';
    }

    if (node.type === 'paragraph' && node.content) {
      const text = node.content.map(processNode).join('');
      if (text.trim()) lines.push(text.trim());
    }

    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        processNode(child);
      }
    }
  }

  const body = tiptapBody.body || {};
  processNode(body);

  return lines.join('\n\n');
}

/**
 * Fetch posts from Circle.so
 */
async function fetchCirclePosts() {
  const response = await fetch(
    `https://app.circle.so/api/admin/v2/posts?space_id=${process.env.CIRCLE_SPACE_ID}&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CIRCLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Circle API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.records || [];
}

/**
 * Get most recent post date from database
 */
async function getMostRecentDate() {
  const { data, error } = await supabase
    .from('posts')
    .select('published_at')
    .order('published_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching most recent date:', error);
    return null;
  }

  return data?.[0]?.published_at || null;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Main sync function
 */
async function syncCircle() {
  console.log('Daily Discipline Circle Sync');
  console.log('============================\n');

  try {
    // Get most recent post in database
    console.log('Checking database for most recent post...');
    const mostRecentDate = await getMostRecentDate();
    console.log(`Most recent post date: ${mostRecentDate || 'None'}\n`);

    // Fetch posts from Circle
    console.log('Fetching posts from Circle.so...');
    const circlePosts = await fetchCirclePosts();
    console.log(`Fetched ${circlePosts.length} posts from Circle\n`);

    // Filter for new posts
    const newPosts = circlePosts.filter(post => {
      if (!post.published_at) return false;
      if (!mostRecentDate) return true;

      const postDate = new Date(post.published_at);
      const recentDate = new Date(mostRecentDate);
      return postDate > recentDate;
    });

    console.log(`Found ${newPosts.length} new posts to sync\n`);

    if (newPosts.length === 0) {
      console.log('✅ Database is up to date!');
      return;
    }

    // Process new posts
    let imported = 0;
    let errors = 0;

    for (const post of newPosts) {
      try {
        // Extract data
        const title = post.name || 'Untitled';
        const slug = post.slug || '';
        const url = post.url || '';
        const publishedAt = post.published_at?.split('T')[0] || '';
        const content = extractTextFromTiptap(post.tiptap_body);

        if (!slug || !url || !publishedAt || !content) {
          console.log(`  ⚠️  Skipping incomplete post: ${title}`);
          continue;
        }

        // Generate embedding
        const embeddingText = `${title}\n\n${content}`;
        const embedding = await generateEmbedding(embeddingText);

        // Upsert to database
        const { error } = await supabase.rpc('upsert_post', {
          p_title: title,
          p_slug: slug,
          p_content: content,
          p_published_at: publishedAt,
          p_url: url,
          p_embedding: embedding,
        });

        if (error) {
          console.error(`  ✗ Error syncing "${title}": ${error.message}`);
          errors++;
        } else {
          console.log(`  ✓ Synced: ${title} (${publishedAt})`);
          imported++;
        }
      } catch (err) {
        console.error(`  ✗ Exception syncing post: ${err.message}`);
        errors++;
      }
    }

    // Summary
    console.log('\n============================');
    console.log('Sync Complete!');
    console.log(`Successfully synced: ${imported}`);
    console.log(`Errors: ${errors}`);
    console.log(`New posts found: ${newPosts.length}`);

    if (imported === newPosts.length) {
      console.log('\n✅ All new posts synced successfully!');
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

// Run sync
syncCircle();
