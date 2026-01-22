#!/usr/bin/env node
/**
 * Import Daily Discipline archive to Supabase with embeddings
 * Usage: node import-archive.js [path-to-markdown-file]
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const ARCHIVE_PATH = process.argv[2] || '../daily_discipline_complete_archive.md';
const BATCH_SIZE = 20;
const DELAY_MS = 1000;

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Parse markdown archive into structured posts
 */
function parseArchive(markdownContent) {
  const posts = [];

  // Split by post separator (### followed by title)
  const sections = markdownContent.split(/^### /m).slice(1);

  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0].trim();

    // Find date and URL
    let date = '';
    let url = '';
    let contentStart = 1;

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('**Date:**')) {
        date = lines[i].replace('**Date:**', '').trim();
      } else if (lines[i].startsWith('**URL:**')) {
        url = lines[i].replace('**URL:**', '').trim();
        contentStart = i + 1;
        break;
      }
    }

    // Extract content (everything after URL until ---)
    const contentLines = [];
    for (let i = contentStart; i < lines.length; i++) {
      if (lines[i].trim() === '---') break;
      if (lines[i].trim()) contentLines.push(lines[i]);
    }
    const content = contentLines.join('\n').trim();

    // Extract slug from URL
    const slug = url.split('/').pop() || '';

    if (title && date && url && content && slug) {
      posts.push({ title, date, url, slug, content });
    }
  }

  return posts;
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
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main import function
 */
async function importArchive() {
  console.log('Daily Discipline Archive Import');
  console.log('================================\n');

  // Read markdown file
  console.log(`Reading archive from: ${ARCHIVE_PATH}`);
  const archivePath = path.resolve(ARCHIVE_PATH);
  const markdownContent = fs.readFileSync(archivePath, 'utf-8');

  // Parse posts
  console.log('Parsing markdown...');
  const posts = parseArchive(markdownContent);
  console.log(`Found ${posts.length} posts\n`);

  if (posts.length === 0) {
    console.error('No posts found in archive!');
    process.exit(1);
  }

  // Process in batches
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (posts ${i + 1}-${Math.min(i + BATCH_SIZE, posts.length)})...`);

    for (const post of batch) {
      try {
        // Generate embedding
        const embeddingText = `${post.title}\n\n${post.content}`;
        const embedding = await generateEmbedding(embeddingText);

        // Insert into Supabase
        const { data, error } = await supabase.rpc('upsert_post', {
          p_title: post.title,
          p_slug: post.slug,
          p_content: post.content,
          p_published_at: post.date,
          p_url: post.url,
          p_embedding: embedding,
        });

        if (error) {
          console.error(`  ✗ Error importing "${post.title}": ${error.message}`);
          errors++;
        } else {
          console.log(`  ✓ Imported: ${post.title} (${post.date})`);
          imported++;
        }
      } catch (err) {
        console.error(`  ✗ Exception importing "${post.title}": ${err.message}`);
        errors++;
      }
    }

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < posts.length) {
      console.log(`  Waiting ${DELAY_MS}ms before next batch...`);
      await sleep(DELAY_MS);
    }
  }

  // Summary
  console.log('\n================================');
  console.log('Import Complete!');
  console.log(`Successfully imported: ${imported}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total posts: ${posts.length}`);

  if (imported === posts.length) {
    console.log('\n✅ All posts imported successfully!');
  } else if (imported > 0) {
    console.log(`\n⚠️  Partial import: ${imported}/${posts.length} posts imported`);
  } else {
    console.log('\n❌ Import failed!');
  }
}

// Run import
importArchive().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
