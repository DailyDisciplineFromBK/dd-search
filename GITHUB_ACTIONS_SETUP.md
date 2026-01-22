# GitHub Actions Setup Guide

The daily Circle sync is automated using GitHub Actions. Follow these steps to set it up.

## Prerequisites

1. GitHub repository created and code pushed
2. All API credentials ready (from your `.env` file)

## Setup Steps

### 1. Push Code to GitHub

```bash
cd /Users/brentwashburn/DIGNVS/dd-search
git init
git add .
git commit -m "Initial commit: Daily Discipline Search"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dd-search.git
git push -u origin main
```

### 2. Add Secrets to GitHub

Go to your repository on GitHub:
1. Click **Settings** (repository settings, not account settings)
2. In left sidebar, click **Secrets and variables** > **Actions**
3. Click **New repository secret** for each of these:

**Required Secrets:**

- **SUPABASE_URL**
  - Value: `https://psujbbiqpimlkkmvohxw.supabase.co`

- **SUPABASE_SERVICE_KEY**
  - Value: Your service_role key from `.env`

- **OPENAI_API_KEY**
  - Value: Your OpenAI API key from `.env`

- **CIRCLE_API_TOKEN**
  - Value: `AzyCRawBDXisKUyW73CgsX9JKWRCvGMf`

- **CIRCLE_SPACE_ID**
  - Value: `1669386`

### 3. Verify Workflow

1. Go to **Actions** tab in your repository
2. You should see "Daily Circle Sync" workflow
3. Click **Run workflow** to test manually
4. Check the logs to ensure it runs successfully

## Schedule

The workflow runs automatically:
- **Time:** 6:00 AM UTC (1:00 AM EST / 10:00 PM PST)
- **Days:** Monday through Friday
- **What it does:** Fetches new posts from Circle.so, generates embeddings, syncs to Supabase

## Manual Trigger

You can manually trigger the sync anytime:
1. Go to **Actions** tab
2. Click **Daily Circle Sync**
3. Click **Run workflow** button
4. Select branch (main)
5. Click **Run workflow**

## Monitoring

### Check if sync is working:

```bash
# View recent workflow runs
gh run list --workflow=sync.yml

# View logs from last run
gh run view --log
```

### Check database directly:

```sql
-- In Supabase SQL Editor, check most recent post
SELECT title, published_at, created_at
FROM posts
ORDER BY published_at DESC
LIMIT 5;
```

## Troubleshooting

### Workflow fails with "API key invalid"
- Check that all secrets are added correctly
- Make sure there are no extra spaces in secret values
- Verify API keys are still active

### No new posts found
- This is normal if no new posts were published
- Check Circle.so to confirm latest post date
- Compare with database: `SELECT MAX(published_at) FROM posts;`

### Workflow doesn't run on schedule
- GitHub Actions can be delayed by up to 10 minutes during high load
- Check Actions tab to see if runs are queued
- Verify the cron schedule in `.github/workflows/sync.yml`

## Cost Estimate

For daily syncs with 1 new post per day:
- **OpenAI embeddings:** ~$0.001 per post = $0.02/month
- **GitHub Actions:** Free (well within free tier limits)
- **Supabase:** Free (well within free tier limits)

**Total:** ~$0.02/month (essentially free)

## Notes

- The workflow uses Node.js 20 LTS
- Runs on Ubuntu latest
- Takes approximately 10-15 seconds per new post (including embedding generation)
- Failed runs will show in the Actions tab for debugging
