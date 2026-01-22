# Daily Discipline Search - Setup Guide

Follow these steps once you have your API keys.

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization (or create one)
4. Project settings:
   - **Name:** daily-discipline-search
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to your users
5. Wait 2-3 minutes for project to provision

## Step 2: Get Supabase Credentials

1. In your Supabase project dashboard:
   - Click **Settings** (gear icon)
   - Click **API**
   - Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - Copy **service_role key** (under "service_role" section)

## Step 3: Run Database Schema

1. In Supabase, click **SQL Editor** (in left sidebar)
2. Click **New query**
3. Open `schema.sql` file from this project
4. Copy entire contents and paste into SQL Editor
5. Click **Run** button
6. Should see success message: "Success. No rows returned"

## Step 4: Configure Environment

1. In this project folder, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGc...
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Circle credentials are already filled in

## Step 5: Install Dependencies

```bash
cd dd-search
npm install
```

Expected output: All packages installed successfully

## Step 6: Run Initial Import

```bash
npm run import
```

This will:
- Parse 2,101 posts from markdown archive
- Generate embeddings via OpenAI
- Upload to Supabase
- Takes ~15-20 minutes
- Costs ~$0.50 in OpenAI credits

**Expected output:**
```
Daily Discipline Archive Import
================================

Reading archive from: ../daily_discipline_complete_archive.md
Parsing markdown...
Found 2101 posts

Processing batch 1 (posts 1-20)...
  ✓ Imported: Just Start (2018-01-01)
  ✓ Imported: Stay simple (2018-01-02)
  ...
```

## Step 7: Verify Import

1. Go back to Supabase dashboard
2. Click **Table Editor**
3. Select **posts** table
4. You should see 2,101 rows

## Step 8: Test Daily Sync

```bash
npm run sync
```

Expected output:
```
Daily Discipline Circle Sync
============================

Checking database for most recent post...
Most recent post date: 2026-01-21

Fetching posts from Circle.so...
Fetched 2101 posts from Circle

Found 0 new posts to sync

✅ Database is up to date!
```

## Troubleshooting

### "Error: Invalid API key"
- Double-check your API keys in `.env`
- Make sure there are no quotes around the keys
- Make sure no extra spaces

### "Error connecting to Supabase"
- Verify your project URL is correct
- Make sure you used the **service_role** key, not anon key
- Check if your Supabase project is still provisioning

### "No posts found in archive"
- Verify path to markdown file is correct
- Default is `../daily_discipline_complete_archive.md`
- Adjust path in command if needed

### Import is slow
- This is normal! 2,101 posts take 15-20 minutes
- OpenAI has rate limits we're respecting
- You can watch progress in terminal

## Next Steps

Once import completes successfully:
1. ✅ Database is ready with all posts
2. Next: Build the search API endpoint
3. Then: Create the frontend widget
4. Finally: Deploy to production

Need help? Check the main README.md or the build plan document.
