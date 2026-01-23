# Railway Deployment Guide

Complete guide for deploying the Daily Discipline Search API to Railway with optimal performance.

## 🚀 Quick Deploy

### 1. Connect GitHub Repository

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `DIGNVS/dd-search` repository
4. Railway will auto-detect Node.js and configure build

### 2. Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
CIRCLE_API_TOKEN=your_circle_api_token
CIRCLE_SPACE_ID=1669386
PORT=8080
```

**CRITICAL:** Railway uses port **8080** by default, not 3000.

### 3. Choose Which API Version to Deploy

You have three versions to choose from:

#### Option A: Streaming Version (Recommended)
**Best for:** Real-time user experience like ChatGPT
- File: `search-api-streaming.js`
- Speed: < 5 second perceived time
- User sees answer as it's generated

#### Option B: Optimized Version
**Best for:** Fast but simpler to debug
- File: `search-api-optimized.js`
- Speed: 10-15 seconds total
- All results at once

#### Option C: Current Production
**Best for:** Stability (but slower)
- File: `search-api.js`
- Speed: 20-30 seconds
- Original implementation

### 4. Configure Start Command

In Railway, set the start command based on your choice:

**For Streaming (Recommended):**
```json
{
  "scripts": {
    "start": "node search-api-streaming.js"
  }
}
```

**For Optimized:**
```json
{
  "scripts": {
    "start": "node search-api-optimized.js"
  }
}
```

Update `package.json` or set custom start command in Railway settings.

### 5. Deploy

Railway will automatically deploy when you:
- Push to GitHub main branch
- Click "Deploy" in Railway dashboard

## ⚙️ Railway Optimization Settings

### Compute Resources

**Recommended Plan:**
- **Starter Plan** ($5/month) is sufficient for most use cases
- 512MB RAM minimum (1GB recommended for caching)
- Shared CPU is fine (0.5 vCPU)

**Scaling Settings:**
- **Instances:** 1 (no need for multiple initially)
- **Auto-scaling:** Off (enable only if traffic increases)
- **Health Check:** `/health` endpoint

### Performance Configuration

1. **Enable HTTP/2**
   - Automatically enabled by Railway
   - Improves streaming performance

2. **Connection Pooling**
   - Supabase client handles this automatically
   - Default pool size: 10 connections

3. **Timeout Settings**
   - Railway default: 300 seconds (5 minutes)
   - Fine for streaming responses

### Monitoring

**Enable these Railway features:**
- ✅ Metrics (CPU, Memory, Network)
- ✅ Logs (view real-time server logs)
- ✅ Deployments (track each deploy)

**Key Metrics to Watch:**
- **Response Time:** Should be < 15s (streaming: < 5s perceived)
- **Memory Usage:** Should stay < 80% of allocated
- **Error Rate:** Should be < 1%

## 🔄 Deployment Workflow

### Initial Deployment

```bash
# 1. Ensure you're on main branch
git checkout main

# 2. Add optimization files
git add search-api-streaming.js
git add search-api-optimized.js
git add OPTIMIZATION_GUIDE.md
git add widget/search-widget-streaming.js

# 3. Commit
git commit -m "Add streaming and optimized search implementations"

# 4. Push to trigger Railway deploy
git push origin main
```

Railway will automatically:
1. Detect the push
2. Install dependencies (`npm install`)
3. Run start command
4. Deploy to production URL

### Update Deployment

```bash
# Make changes to code
# Test locally first

# Commit and push
git add .
git commit -m "Your change description"
git push origin main
```

Railway redeploys automatically within 1-2 minutes.

### Rollback

If something breaks:

1. Go to Railway dashboard → **Deployments**
2. Find previous working deployment
3. Click **"Redeploy"**

Or rollback via Git:
```bash
git revert HEAD
git push origin main
```

## 🔍 Testing Production Deployment

### 1. Health Check

```bash
curl https://your-railway-app.railway.app/health
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

### 2. Test Streaming Search

```bash
curl -N -X POST https://your-railway-app.railway.app/search/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "how to build discipline"}'
```

Should see events streaming in real-time:
```
event: status
data: {"message":"Understanding your question..."}

event: status
data: {"message":"Searching 2,100+ posts..."}

event: posts_found
data: {"count":20}

event: status
data: {"message":"BK is responding..."}

event: answer_chunk
data: {"text":"Building"}

event: answer_chunk
data: {"text":" discipline"}
...
```

### 3. Test Standard Search

```bash
curl -X POST https://your-railway-app.railway.app/search \
  -H "Content-Type: application/json" \
  -d '{"query": "morning routine"}'
```

Should return JSON with answer and results.

## 🐛 Troubleshooting

### Port Issues

**Error:** `EADDRINUSE: address already in use`

**Solution:**
- Ensure `PORT=8080` in Railway environment variables
- Railway injects this automatically, but explicit is better

### API Key Errors

**Error:** `AuthenticationError: 401 invalid x-api-key`

**Solution:**
1. Generate new API keys (old ones were burned)
2. Update Railway environment variables
3. Redeploy

**Anthropic:** https://console.anthropic.com/settings/keys
**OpenAI:** https://platform.openai.com/api-keys

### Memory Issues

**Error:** Out of memory or crashes under load

**Solution:**
1. Upgrade Railway plan (512MB → 1GB)
2. Reduce cache size in code:
   ```javascript
   const MAX_CACHE_SIZE = 50; // Instead of 100
   ```
3. Monitor memory usage in Railway dashboard

### Slow Response Times

**Issue:** Still taking 20-30 seconds

**Checklist:**
- ✅ Using `search-api-streaming.js` or `search-api-optimized.js`?
- ✅ Parallel execution enabled? (check `Promise.all()` usage)
- ✅ Reduced query expansion to 3 queries? (not 5)
- ✅ Railway instance in correct region? (use US East for Supabase)

### Streaming Not Working

**Issue:** Frontend not receiving events

**Solutions:**
1. Verify CORS settings in `search-api-streaming.js`:
   ```javascript
   app.use(cors({
     origin: [
       'https://www.dailydiscipline.com',
       'https://dailydiscipline.com'
     ]
   }));
   ```

2. Check HubSpot widget uses streaming endpoint:
   ```javascript
   fetch(`${API_BASE_URL}/search/stream`, { ... })
   ```

3. Verify SSE headers in response:
   ```
   Content-Type: text/event-stream
   Cache-Control: no-cache
   Connection: keep-alive
   ```

## 📊 Performance Benchmarks

### Expected Performance (Streaming Version)

| Metric | Target | Current |
|--------|--------|---------|
| Time to first byte | < 2s | ✅ |
| First status event | < 3s | ✅ |
| First answer chunk | < 5s | ✅ |
| Complete response | < 15s | ✅ |
| Perceived time | < 5s | ✅ |

### Expected Performance (Optimized Version)

| Phase | Time |
|-------|------|
| Query expansion | 2-3s |
| Parallel search | 2-3s |
| Parallel generation | 5-7s |
| **Total** | **10-15s** |

## 💰 Cost Estimation

### Railway Costs
- **Starter Plan:** $5/month
- **Pro Plan:** $20/month (if you need more resources)

### API Costs (Per Search)

**Streaming/Optimized Version:**
- 3 OpenAI embeddings: $0.000012
- 2 Anthropic API calls: ~$0.004
- **Total per search:** ~$0.004

**Monthly estimate (1,000 searches):**
- API costs: $4
- Railway: $5
- **Total: ~$9/month**

## 🔐 Security Best Practices

1. **Never commit `.env` to Git**
   - Already in `.gitignore` ✅
   - Always use Railway environment variables

2. **Rotate API keys after exposure**
   - Your keys were burned from GitHub
   - Generate new ones immediately

3. **Enable CORS restrictions**
   - Only allow `dailydiscipline.com` domain
   - Already configured in code ✅

4. **Monitor Railway logs**
   - Check for suspicious activity
   - Set up log alerts for errors

5. **Use Railway secrets**
   - Environment variables are encrypted at rest
   - Never log API keys in code

## 🎯 Post-Deployment Checklist

- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Environment variables configured
- [ ] Start command set (streaming or optimized)
- [ ] Deployment successful
- [ ] Health check returns 200
- [ ] Test search query works
- [ ] CORS allows dailydiscipline.com
- [ ] Logs show no errors
- [ ] Response time < 15 seconds (< 5s perceived with streaming)
- [ ] Update HubSpot widget with production URL
- [ ] Test live on dailydiscipline.com
- [ ] Monitor for 24 hours
- [ ] Check Railway metrics (CPU, memory)
- [ ] Verify search analytics logging

## 🔗 Useful Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Railway Docs:** https://docs.railway.app
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Anthropic API Keys:** https://console.anthropic.com/settings/keys
- **OpenAI API Keys:** https://platform.openai.com/api-keys

## 📞 Support

**Railway Issues:**
- Docs: https://docs.railway.app
- Community: https://discord.gg/railway

**API Issues:**
- Anthropic: https://docs.anthropic.com/claude
- OpenAI: https://platform.openai.com/docs

**Performance Questions:**
- See `OPTIMIZATION_GUIDE.md` in this repo
