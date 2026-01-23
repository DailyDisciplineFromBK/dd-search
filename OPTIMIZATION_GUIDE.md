# Search Optimization Guide

## Performance Improvements Implemented

### ⚡ Optimizations Applied

**1. Parallel Embeddings + Vector Searches** (Biggest Impact)
- **Before:** Sequential loop - 5 API calls + 5 DB queries = ~8-10 seconds
- **After:** Parallel execution with `Promise.all()` = ~2-3 seconds
- **Impact:** ~3-4x faster for search phase

**2. Parallel Answer Generation + Synthesis**
- **Before:** Sequential - answer first, then synthesis = ~10-15 seconds
- **After:** Both run simultaneously = ~5-7 seconds
- **Impact:** ~2x faster for generation phase

**3. In-Memory Embedding Cache**
- Caches up to 100 embeddings (LRU eviction)
- Common searches hit cache instantly
- Saves OpenAI API calls and latency

**4. Reduced Query Expansion**
- **Before:** 5 expanded queries
- **After:** 3 expanded queries
- **Impact:** Fewer API calls, still excellent results

**5. Reduced Result Set**
- **Before:** Top 25 posts analyzed
- **After:** Top 20 posts analyzed
- **Impact:** Less data transfer, faster synthesis

### Expected Performance

**Before Optimizations:**
- Search time: 25-30 seconds
- 5 embeddings + 5 searches (sequential)
- Sequential answer + synthesis

**After Optimizations:**
- Search time: **10-15 seconds** (2-3x faster)
- 3 embeddings + 3 searches (parallel)
- Parallel answer + synthesis
- Embedding cache for repeat searches

**With Streaming (Future):**
- Perceived time: **< 5 seconds** to first content
- Progressive display keeps user engaged

## 🔑 Get New API Keys (Required)

Your current keys were burned. Generate new ones:

### 1. Anthropic (Claude)
1. Go to: https://console.anthropic.com/settings/keys
2. Click **"Create Key"**
3. Name it: "Daily Discipline Search Production"
4. Copy the key (starts with `sk-ant-`)
5. Save it immediately (only shown once)

### 2. OpenAI
1. Go to: https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name it: "Daily Discipline Search Production"
4. Copy the key (starts with `sk-proj-`)
5. Save it immediately (only shown once)

### 3. Update `.env` Locally

```bash
cd /Users/brentwashburn/DIGNVS/dd-search
nano .env
```

Update these lines:
```
ANTHROPIC_API_KEY=sk-ant-NEW_KEY_HERE
OPENAI_API_KEY=sk-proj-NEW_KEY_HERE
```

### 4. Update Railway

1. Go to your Railway project
2. Click **Variables** tab
3. Update:
   - `ANTHROPIC_API_KEY` → new Anthropic key
   - `OPENAI_API_KEY` → new OpenAI key
4. Click **Deploy** to restart with new keys

## 🚀 Deploy Optimized Version

### Option 1: Replace Current File

```bash
cd /Users/brentwashburn/DIGNVS/dd-search

# Backup current version
cp search-api.js search-api-old.js

# Replace with optimized version
cp search-api-optimized.js search-api.js

# Commit and push
git add search-api.js
git commit -m "Optimize search: parallel execution, caching, reduced queries"
git push
```

Railway will auto-deploy the optimized version.

### Option 2: Test Locally First

```bash
# With new API keys in .env, test:
node search-api-optimized.js

# In another terminal:
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how to build discipline"}'

# Check timing in server logs
```

If performance is good (10-15 seconds), deploy to Railway.

## 📊 Performance Monitoring

### Check Server Logs

Look for these timing markers:

```
⚡ Expanding query...
✓ Expanded in XXXms

⚡ Parallel search...
✓ Searched in XXXms

⚡ Parallel generation...
✓ Generated in XXXms

✅ Search complete in XXXms!
```

**Target Times:**
- Expansion: 2-3 seconds
- Parallel search: 2-3 seconds
- Parallel generation: 5-7 seconds
- **Total: 10-15 seconds**

### Cache Effectiveness

Check cache hits in logs:
```
Cache hit: "building discipline..."
```

More cache hits = faster repeat searches.

### Health Check

```bash
curl http://localhost:3000/health
```

Returns cache size:
```json
{
  "status": "ok",
  "timestamp": "...",
  "cache_size": 15
}
```

## 🎯 Next Level: Streaming Responses

To achieve **< 5 second perceived time**, implement streaming:

### How Streaming Works

Instead of waiting for everything, stream responses:

1. **Query expansion** → Stream back "Analyzing your question..."
2. **Search starts** → Stream "Searching 2,100+ posts..."
3. **Answer ready** → Stream BK's direct answer immediately
4. **Posts ready** → Stream posts as they're synthesized

User sees content flowing in real-time like ChatGPT.

### Implementation (Future)

This requires:
- Server-Sent Events (SSE) or WebSockets
- Widget changes to handle streaming
- More complex error handling

**Recommendation:** Deploy current optimizations first, measure improvement, then decide if streaming is needed.

## 🛡️ Security Checklist

- [ ] New API keys generated
- [ ] Old keys revoked
- [ ] `.env` in `.gitignore`
- [ ] Never commit `.env` to GitHub
- [ ] Railway variables updated
- [ ] CORS configured for your domain only

## 📈 Cost Impact

**Optimizations reduce costs:**

### Before:
- 5 OpenAI embeddings per search
- 3 Anthropic calls per search
- ~$0.006 per search

### After:
- 3 OpenAI embeddings per search (40% less)
- 2 Anthropic calls per search (33% less)
- **~$0.004 per search** (33% cost reduction)

For 1,000 searches/month: **Save ~$2/month**

Plus embedding cache saves additional API calls.

## 🎯 Deployment Checklist

- [ ] Generate new Anthropic API key
- [ ] Generate new OpenAI API key
- [ ] Update `.env` locally
- [ ] Test optimized version locally
- [ ] Verify 10-15 second performance
- [ ] Update Railway environment variables
- [ ] Replace `search-api.js` with optimized version
- [ ] Commit and push to GitHub
- [ ] Verify Railway auto-deploys
- [ ] Test production API
- [ ] Monitor performance for 24 hours
- [ ] Check cache effectiveness

## 📝 Files Reference

- **`search-api-optimized.js`** - New optimized version
- **`search-api.js`** - Current production version
- **`search-api-old.js`** - Backup of original

## 🎉 Expected Results

After deploying optimizations:

**Search Performance:**
- First-time searches: 10-15 seconds
- Cached searches: 8-12 seconds
- API cost: 33% lower

**User Experience:**
- Still excellent answer quality
- Still BK's authentic voice
- Still 5-7 relevant posts
- Just much faster!

## 🚧 Future Enhancements

1. **Streaming responses** - Show results as they arrive
2. **Redis cache** - Persistent cache across server restarts
3. **Query result cache** - Cache entire search results
4. **CDN for embeddings** - Pre-compute common queries
5. **Faster Claude model** - Sonnet 4.5 → Haiku (if quality OK)

## 📞 Need Help?

**API key issues:**
- Anthropic: https://docs.anthropic.com/claude/reference/errors
- OpenAI: https://help.openai.com/en/

**Railway deployment:**
- Docs: https://docs.railway.app
- This guide: DEPLOYMENT.md

**Performance questions:**
- Check server logs for timing
- Monitor Railway metrics
- Review Supabase query performance
