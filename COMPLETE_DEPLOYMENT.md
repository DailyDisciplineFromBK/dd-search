# Complete Deployment Guide

This guide consolidates all steps to deploy your optimized Daily Discipline Search API from development to production.

## 📋 Overview

You have **three versions** of the search API:

| Version | File | Speed | Status | Use Case |
|---------|------|-------|--------|----------|
| **Streaming** | `search-api-streaming.js` | < 5s perceived | ✅ Ready | **Recommended** - Real-time like ChatGPT |
| **Optimized** | `search-api-optimized.js` | 10-15s | ✅ Ready | Fast, simpler to debug |
| **Current** | `search-api.js` | 20-30s | ⚠️ Slow | Original production version |

**Recommendation:** Deploy the **Streaming** version for the best user experience.

## 🎯 Quick Start (5 Steps)

### 1. Secure Your Repository

```bash
# Fix .env.example (already done)
git add .env.example

# Add new optimization files
git add search-api-streaming.js
git add search-api-optimized.js
git add OPTIMIZATION_GUIDE.md
git add RAILWAY_DEPLOYMENT.md
git add SECURITY_CHECKLIST.md
git add COMPLETE_DEPLOYMENT.md
git add widget/search-widget-streaming.js

# Commit
git commit -m "Add streaming/optimized search + deployment guides"

# Push
git push origin main
```

### 2. Generate New API Keys

**Your old keys were burned - generate new ones immediately:**

**Anthropic:**
1. https://console.anthropic.com/settings/keys
2. Delete old key
3. Create new key: "Daily Discipline Search Production"
4. Copy `sk-ant-...` key

**OpenAI:**
1. https://platform.openai.com/api-keys
2. Delete old key
3. Create new key: "Daily Discipline Search Production"
4. Copy `sk-proj-...` key

**Circle.so:**
1. Go to Circle.so → Settings → API
2. Revoke old token
3. Generate new token
4. Copy token

### 3. Update Local Environment

```bash
cd /Users/brentwashburn/DIGNVS/dd-search
nano .env
```

Update with your NEW keys:
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY
ANTHROPIC_API_KEY=sk-ant-YOUR_NEW_KEY
CIRCLE_API_TOKEN=YOUR_NEW_CIRCLE_TOKEN
CIRCLE_SPACE_ID=1669386
PORT=3000
```

### 4. Update Railway Variables

1. Go to Railway dashboard
2. Click on your project
3. Go to **Variables** tab
4. Update these variables with NEW keys:
   - `ANTHROPIC_API_KEY` → new Anthropic key
   - `OPENAI_API_KEY` → new OpenAI key
   - `CIRCLE_API_TOKEN` → new Circle token
   - `PORT` → `8080` (Railway uses 8080, not 3000)

### 5. Configure Railway for Streaming

Update `package.json` to use streaming version:

```json
{
  "name": "dd-search",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "start": "node search-api-streaming.js",
    "dev": "node search-api-streaming.js",
    "sync": "node sync-circle.js",
    "import": "node import-archive.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.38.1",
    "@supabase/supabase-js": "^2.49.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "openai": "^4.77.3"
  }
}
```

Commit and push:
```bash
git add package.json
git commit -m "Configure Railway to use streaming API"
git push origin main
```

Railway will automatically redeploy with the streaming version.

## 🧪 Test Locally First

Before deploying to Railway, test the streaming version locally:

```bash
# Start the streaming API
node search-api-streaming.js
```

In another terminal, test the streaming endpoint:

```bash
curl -N -X POST http://localhost:3000/search/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "how to build discipline"}'
```

You should see events streaming:
```
event: status
data: {"message":"Understanding your question..."}

event: status
data: {"message":"Searching 2,100+ posts..."}

event: answer_chunk
data: {"text":"Building"}

event: answer_chunk
data: {"text":" discipline"}
...
```

If this works, you're ready for production.

## 🚀 Deploy to Railway

Railway will auto-deploy when you push to GitHub. Monitor the deployment:

1. Go to Railway dashboard
2. Click **Deployments** tab
3. Watch the build logs
4. Wait for "Deployment successful"

Check deployment URL:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T...",
  "cache_size": 0,
  "version": "3.0.0-streaming"
}
```

## 🎨 Update HubSpot Widget

Update the widget to use streaming endpoint:

### Option 1: Update Existing Module

Edit `hubspot-module/dd-search.module/module.js`:

```javascript
// Update API_BASE_URL to your Railway URL
const API_BASE_URL = 'https://your-app.railway.app';

// Use streaming endpoint
async function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    showStatus('Please enter a search query', 'error');
    return;
  }

  try {
    isSearching = true;
    searchButton.disabled = true;
    hideResults();

    // Show initial status
    showStatus('Starting search...', 'loading');

    // Use streaming
    await searchWithStreaming(query);

  } catch (error) {
    console.error('Search error:', error);
    showStatus('Search failed. Please try again.', 'error');
  } finally {
    isSearching = false;
    searchButton.disabled = false;
  }
}

// Streaming implementation
async function searchWithStreaming(query) {
  return new Promise((resolve, reject) => {
    searchResults.innerHTML = `
      <div class="direct-answer">
        <div class="answer-label">FROM BK</div>
        <div class="answer-text" id="streaming-answer"></div>
      </div>
      <div class="results-header">Related Posts</div>
      <div class="results-list" id="streaming-posts"></div>
    `;
    searchResults.classList.add('visible');

    const answerDiv = document.getElementById('streaming-answer');
    const postsDiv = document.getElementById('streaming-posts');

    const response = fetch(`${API_BASE_URL}/search/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    response.then(res => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function processStream() {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n\\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;

            const eventMatch = line.match(/^event: (.+)$/m);
            const dataMatch = line.match(/^data: (.+)$/m);

            if (eventMatch && dataMatch) {
              const event = eventMatch[1];
              const data = JSON.parse(dataMatch[1]);
              handleStreamEvent(event, data, answerDiv, postsDiv);
            }
          }

          processStream();
        }).catch(reject);
      }

      processStream();
    }).catch(reject);
  });
}

function handleStreamEvent(event, data, answerDiv, postsDiv) {
  switch (event) {
    case 'status':
      showStatus(data.message, 'loading');
      break;

    case 'answer_chunk':
      answerDiv.textContent += data.text;
      break;

    case 'results':
      displayPosts(data.posts, postsDiv);
      break;

    case 'complete':
      showStatus('');
      break;

    case 'error':
      showStatus(data.message, 'error');
      break;
  }
}

function displayPosts(posts, container) {
  const postsHTML = posts.map((result) => {
    const date = new Date(result.published_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="result-card">
        <h3 class="result-title">
          <a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(result.title)}
          </a>
        </h3>
        <div class="result-meta">
          <span>${date}</span>
        </div>
        <div class="result-relevance">
          ${escapeHtml(result.relevance)}
        </div>
        <div class="result-content">
          ${escapeHtml(result.content)}
        </div>
        <a href="${escapeHtml(result.url)}" class="result-link" target="_blank" rel="noopener noreferrer">
          Read full post →
        </a>
      </div>
    `;
  }).join('');

  container.innerHTML = postsHTML;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Option 2: Use Pre-built Streaming Widget

Use the already-created `widget/search-widget-streaming.js` file.

### Deploy to HubSpot

```bash
# Upload updated module
hs cms upload hubspot-module/dd-search.module Leap/modules/dd-search.module --account=108516
```

## ✅ Verify Deployment

### 1. Test API Health

```bash
curl https://your-app.railway.app/health
```

### 2. Test Streaming Search

```bash
curl -N -X POST https://your-app.railway.app/search/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "morning routine"}'
```

### 3. Test on Daily Discipline

1. Go to https://www.dailydiscipline.com/search (or wherever module is embedded)
2. Type a search query
3. Verify you see:
   - "Starting search..." status
   - "Searching 2,100+ posts..." status
   - Answer from BK streaming in real-time
   - Related posts appearing

### 4. Check Performance

Open browser DevTools → Network tab:
- Time to first byte: < 2s
- First answer chunk: < 5s
- Total time: < 15s

### 5. Monitor Railway Logs

```bash
# Or view in Railway dashboard
# Look for:
```
```
Daily Discipline Search API (STREAMING)
========================================
Server running on http://localhost:8080

🔍 Search query: "morning routine"
⚡ Expanding query...
✓ Expanded in 2.1s
⚡ Parallel search...
✓ Searched in 2.3s
⚡ Streaming answer...
✓ Answer streamed in 4.7s
✅ Search complete in 9.1s!
```

## 📊 Performance Comparison

| Version | Implementation | Time | User Experience |
|---------|----------------|------|-----------------|
| **Original** | `search-api.js` | 20-30s | Waits 30s, sees nothing, then results |
| **Optimized** | `search-api-optimized.js` | 10-15s | Waits 15s, then sees results |
| **Streaming** | `search-api-streaming.js` | < 5s perceived | Sees updates every 2s, engaging |

## 🐛 Troubleshooting

### Streaming Not Working

**Symptom:** No events received, or frontend hangs

**Solutions:**
1. Verify Railway uses `search-api-streaming.js`:
   ```json
   // package.json
   "scripts": {
     "start": "node search-api-streaming.js"
   }
   ```

2. Check CORS includes your domain:
   ```javascript
   app.use(cors({
     origin: [
       'https://www.dailydiscipline.com',
       'https://dailydiscipline.com'
     ]
   }));
   ```

3. Verify fetch uses correct endpoint:
   ```javascript
   fetch(`${API_BASE_URL}/search/stream`, { ... })
   ```

### Still Slow (> 15 seconds)

**Check:**
- [ ] Using streaming or optimized version (not original)?
- [ ] Query expansion reduced to 3 queries (not 5)?
- [ ] Parallel execution with `Promise.all()`?
- [ ] Railway region close to Supabase region?

### API Key Errors

**Error:** `AuthenticationError: 401 invalid x-api-key`

**Solution:**
1. Generate NEW keys (old ones burned)
2. Update Railway environment variables
3. Redeploy

### Port Errors

**Error:** `EADDRINUSE: address already in use`

**Solution:**
- Railway: Use `PORT=8080`
- Local: Use `PORT=3000` or kill existing process:
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```

## 🎯 Post-Deployment Checklist

- [ ] API keys rotated (old ones revoked)
- [ ] Railway environment variables updated
- [ ] `package.json` configured for streaming
- [ ] Code pushed to GitHub
- [ ] Railway auto-deployed successfully
- [ ] Health check returns 200 OK
- [ ] Streaming endpoint works (`/search/stream`)
- [ ] Standard endpoint works (`/search`)
- [ ] HubSpot widget updated with Railway URL
- [ ] Widget uses streaming endpoint
- [ ] Module uploaded to HubSpot
- [ ] Live test on dailydiscipline.com
- [ ] Response time < 5 seconds perceived
- [ ] Answer streams in real-time
- [ ] Posts display correctly
- [ ] No errors in browser console
- [ ] No errors in Railway logs
- [ ] Railway CPU < 50%
- [ ] Railway memory < 80%
- [ ] Search analytics logging works

## 📈 Monitor Performance

### Railway Dashboard

Check these metrics daily for first week:
- **CPU Usage:** Should be < 50%
- **Memory Usage:** Should be < 400MB (out of 512MB)
- **Response Time:** Should be < 15s
- **Error Rate:** Should be < 1%

### Supabase Analytics

1. Go to Supabase Dashboard → Your Project
2. Click **Database** → **Query Performance**
3. Check `search_posts` function performance
4. Should be < 500ms per query

### Search Analytics

Check logged searches:
```sql
SELECT
  query,
  COUNT(*) as search_count,
  AVG(search_time_ms) as avg_time,
  results_count
FROM search_queries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query, results_count
ORDER BY search_count DESC
LIMIT 20;
```

## 💰 Cost Breakdown

### Railway
- **Plan:** Starter ($5/month)
- **Usage:** ~$5/month (flat rate)

### API Costs (Per 1,000 Searches)
- OpenAI embeddings (3 per search): $0.012
- Anthropic calls (2 per search): $4.00
- **Total:** ~$4.01 per 1,000 searches

### Monthly Estimate
- 1,000 searches: $9/month
- 5,000 searches: $25/month
- 10,000 searches: $45/month

## 📚 Documentation Reference

- **Setup:** `SETUP_GUIDE.md`
- **Deployment:** `DEPLOYMENT.md`
- **Railway:** `RAILWAY_DEPLOYMENT.md`
- **Security:** `SECURITY_CHECKLIST.md`
- **Optimization:** `OPTIMIZATION_GUIDE.md`
- **HubSpot:** `HUBSPOT_DEPLOYMENT.md`
- **Enhanced Search:** `ENHANCED_SEARCH.md`
- **BK Voice:** `BK_VOICE_SEARCH.md`
- **GitHub Actions:** `GITHUB_ACTIONS_SETUP.md`

## 🎉 Success Criteria

Your deployment is successful when:

✅ Search responds in < 5 seconds (perceived)
✅ Answer streams in real-time like ChatGPT
✅ BK's voice is authentic and helpful
✅ 5-7 relevant posts returned
✅ No errors in logs
✅ Railway metrics healthy
✅ API costs reasonable
✅ Users can search directly on dailydiscipline.com

## 🚀 Next Steps

After successful deployment:

1. **Monitor for 24 hours**
   - Check Railway logs every few hours
   - Verify no errors
   - Check response times

2. **Gather User Feedback**
   - Test with real users
   - Collect feedback on speed and results
   - Adjust as needed

3. **Optimize Further** (if needed)
   - Implement Redis cache for repeat queries
   - Add CDN for static assets
   - Consider faster Claude model (Haiku)

4. **Scale Up** (if traffic increases)
   - Upgrade Railway plan
   - Add rate limiting
   - Implement caching layer

## 📞 Support

**Issues?**
- Check `RAILWAY_DEPLOYMENT.md` for Railway-specific help
- Check `SECURITY_CHECKLIST.md` for security issues
- Check `OPTIMIZATION_GUIDE.md` for performance problems

**Still stuck?**
- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Anthropic Docs: https://docs.anthropic.com/claude

---

**You're ready to deploy!** Follow the 5 steps at the top and you'll have a fast, streaming search experience on Daily Discipline in less than 30 minutes.
