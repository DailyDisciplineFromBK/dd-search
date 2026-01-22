# Deploy to HubSpot - Complete Guide

## Overview

This guide walks you through deploying the search API and integrating the widget into your HubSpot site.

## Part 1: Deploy the API to Railway (Recommended)

### Why Railway?
- Easiest setup (5 minutes)
- Automatic deploys from GitHub
- Generous free tier
- Great for this use case

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Verify your account

### Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account if not already
4. Select your dd-search repository

Railway will automatically detect it's a Node.js project.

### Step 3: Configure Environment Variables

In Railway project settings:

1. Click **Variables** tab
2. Add each variable from your `.env` file:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=service_role_key_here
OPENAI_API_KEY=sk-xxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
CIRCLE_API_TOKEN=xxxxxxxx
CIRCLE_SPACE_ID=xxxxxxxx
PORT=3000
```

### Step 4: Configure Start Command

1. In Railway, go to **Settings**
2. Under **Deploy**, set **Start Command**:
   ```
   node search-api.js
   ```

### Step 5: Deploy

1. Railway will automatically deploy
2. Wait 2-3 minutes for build
3. Check **Deployments** tab for status

### Step 6: Get Your Public URL

1. In Railway project, click **Settings**
2. Under **Networking**, click **Generate Domain**
3. Copy your URL (e.g., `https://dd-search-production.up.railway.app`)

### Step 7: Enable CORS for Your Domain

Update `search-api.js` to allow your domain:

```javascript
// Replace this line:
app.use(cors());

// With this:
app.use(cors({
  origin: [
    'https://www.dailydiscipline.com',
    'https://dailydiscipline.com',
    'http://localhost:3001' // Keep for local testing
  ]
}));
```

Commit and push to redeploy.

### Step 8: Test Your Production API

```bash
curl -X POST https://your-app.railway.app/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how to build discipline"}'
```

You should get a JSON response with BK's answer and posts.

---

## Part 2: Prepare for HubSpot

### Step 1: Update Widget with Production URL

Edit `widget/hubspot-embed.html`:

Find this line (around line 285):
```javascript
const API_BASE_URL = 'http://localhost:3000';
```

Change to your Railway URL:
```javascript
const API_BASE_URL = 'https://your-app.railway.app';
```

### Step 2: Review the Widget Code

The file `widget/hubspot-embed.html` is a single-file version containing:
- All CSS (scoped to `#dd-search-widget`)
- All JavaScript (wrapped in IIFE to avoid conflicts)
- All HTML structure

This is ready to paste into HubSpot.

---

## Part 3: Add to HubSpot

### Option A: Custom HTML Module (Recommended)

This gives you maximum control and reusability.

#### Step 1: Create Custom Module

1. In HubSpot, go to **Marketing** → **Files and Templates** → **Design Tools**
2. Click **File** → **New File** → **Module**
3. Name it: "Daily Discipline Search"

#### Step 2: Add HTML Field

1. In the module editor, click **Add field**
2. Select **Rich text**
3. Name it: "Search Widget"

#### Step 3: Add Module HTML

In the **HTML + HubL** section, paste:

```html
<div id="dd-search-widget-container">
  {{ module.search_widget }}
</div>
```

#### Step 4: Add Widget Code

1. Click the **Rich text** field you created
2. Switch to **Source code** view (< > icon)
3. Copy the entire contents of `widget/hubspot-embed.html`
4. Paste it in
5. Click **Publish changes**

#### Step 5: Add to Page

1. Go to any HubSpot page or create a new one
2. Add a **Custom module**
3. Select "Daily Discipline Search"
4. Position it where you want
5. Publish the page

### Option B: Direct HTML Module

For quick testing or one-off pages:

#### Step 1: Edit Page

1. Open the page in HubSpot editor
2. Click where you want the search widget

#### Step 2: Add HTML Module

1. Click **Add** (+)
2. Select **HTML** module
3. Paste entire contents of `widget/hubspot-embed.html`
4. Click outside to save

#### Step 3: Publish

1. Preview to test
2. Publish when ready

---

## Part 4: Test on HubSpot

### Verify It Works

1. Open your HubSpot page
2. Try searching: "how to build discipline"
3. Should see:
   - Direct answer from BK
   - Related posts below
   - Links working

### Check Console for Errors

1. Open browser DevTools (F12)
2. Check **Console** tab
3. Look for any errors
4. Common issues:
   - CORS errors → Check Railway CORS settings
   - API errors → Verify Railway is running
   - 404 errors → Check API_BASE_URL is correct

### Test Various Queries

Try these to verify intelligence:
- "how to build a player-led culture"
- "overcoming procrastination"
- "starting a business"
- "dealing with self-doubt"

---

## Part 5: Customize for Your Site

### Match Your Brand Colors

In `hubspot-embed.html`, find the CSS section and update colors:

```css
/* Primary color (buttons, links) */
#2563eb → #YOUR_BRAND_COLOR

/* Answer box gradient */
background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
→ background: linear-gradient(135deg, #YOUR_DARK 0%, #YOUR_LIGHT 100%);
```

### Adjust Text

```html
<h2>Search Daily Discipline Archive</h2>
<p class="search-subtitle">Search 2,100+ posts...</p>
```

Change to match your site's voice.

### Widget Width

```css
#dd-search-widget {
  max-width: 800px; /* Adjust as needed */
}
```

---

## Part 6: Enable Analytics Schema

### Run in Supabase

1. Go to Supabase dashboard
2. Click **SQL Editor**
3. Click **New query**
4. Paste contents of `schema-search-queries.sql`
5. Click **Run**
6. Should see: "Success. No rows returned"

This enables search query logging.

### Verify Logging Works

After some searches on your site:

```sql
SELECT * FROM recent_searches LIMIT 10;
```

Should show search queries.

---

## Part 7: Monitor Performance

### Check Railway Logs

1. In Railway project, click **Deployments**
2. Click most recent deployment
3. View **Logs** tab
4. Look for:
   - Search queries
   - Response times
   - Any errors

### Check Supabase Analytics

```sql
-- Daily search volume
SELECT * FROM search_analytics_daily
ORDER BY day DESC
LIMIT 7;

-- Popular searches
SELECT * FROM popular_searches
LIMIT 20;

-- Searches with no results
SELECT query, created_at
FROM search_queries
WHERE results_count = 0
ORDER BY created_at DESC;
```

### Monitor API Costs

**Railway:** Check usage in Railway dashboard

**OpenAI:** Check usage at https://platform.openai.com/usage

**Anthropic:** Check usage at https://console.anthropic.com/settings/cost

---

## Troubleshooting

### CORS Errors

**Error:** "Access blocked by CORS policy"

**Fix:**
1. Update CORS in `search-api.js`:
   ```javascript
   app.use(cors({
     origin: ['https://www.dailydiscipline.com', 'https://dailydiscipline.com']
   }));
   ```
2. Commit and push to redeploy on Railway

### API Not Responding

**Check:**
1. Railway deployment status (should be "Active")
2. Railway logs for errors
3. Environment variables are all set
4. Start command is `node search-api.js`

### Widget Not Appearing

**Check:**
1. Browser console for errors
2. API_BASE_URL in widget code is correct
3. HubSpot page is published (not draft)
4. CSS isn't being overridden by HubSpot theme

### Slow Searches

**Expected:** 25-30 seconds is normal

**To improve:**
- Enable caching (future enhancement)
- Use faster Claude model (reduces quality slightly)
- Reduce number of expanded queries (reduces relevance)

### Searches Return No Results

**Check analytics:**
```sql
SELECT query FROM search_queries
WHERE results_count = 0;
```

These are content gaps - opportunities for new Daily Discipline posts.

---

## Security Checklist

- [ ] All API keys in Railway environment variables (not in code)
- [ ] CORS configured for only your domains
- [ ] Railway environment is production
- [ ] `.env` file in `.gitignore`
- [ ] SSL/HTTPS enabled (Railway does this automatically)
- [ ] Supabase RLS policies reviewed (optional but recommended)

---

## Cost Estimate

**Monthly costs for 1,000 searches:**

- Railway: $5 (starter plan)
- OpenAI: $0.10 (embeddings)
- Anthropic: $5 (Claude API calls)
- Supabase: Free (well within limits)

**Total: ~$10-12/month**

**For 5,000 searches:** ~$35-40/month

---

## Going Live Checklist

Before announcing to users:

- [ ] API deployed to Railway
- [ ] Environment variables configured
- [ ] CORS enabled for your domain
- [ ] Widget updated with production API URL
- [ ] Widget added to HubSpot page(s)
- [ ] Tested with 5+ different queries
- [ ] Analytics schema deployed to Supabase
- [ ] Monitoring set up (Railway + Supabase)
- [ ] Test on mobile devices
- [ ] Verify links to posts work
- [ ] Check page load speed

---

## Future Enhancements

Once live, consider:

1. **Caching** - Cache common searches for faster response
2. **Feedback** - Add "Was this helpful?" buttons
3. **Related Questions** - Suggest follow-up searches
4. **Featured Posts** - Highlight especially relevant posts
5. **Search Trends** - Weekly report of top searches
6. **Content Strategy** - Use search data to guide new posts

---

## Support

**Deployment issues:**
- Railway docs: https://docs.railway.app
- DEPLOYMENT.md for other hosting options

**HubSpot issues:**
- HubSpot support: https://help.hubspot.com
- widget/README.md for customization

**Search quality:**
- ENHANCED_SEARCH.md for how it works
- BK_VOICE_SEARCH.md for voice guidelines

**Analytics:**
- BK_VOICE_SEARCH.md for query examples
- schema-search-queries.sql for schema

---

## Summary

You now have:
- ✅ Production API running on Railway
- ✅ Search widget on dailydiscipline.com
- ✅ BK answering every question authentically
- ✅ Analytics tracking all searches
- ✅ 2,100+ posts searchable and accessible

The search system is a **powerful resource** for your community to learn and enable their skills through BK's voice and Daily Discipline's wisdom.
