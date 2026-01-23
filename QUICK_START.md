# Quick Start Guide

Get your optimized Daily Discipline Search API deployed in 15 minutes.

## ⚡ TL;DR

```bash
# 1. Generate new API keys (yours were burned)
# Anthropic: https://console.anthropic.com/settings/keys
# OpenAI: https://platform.openai.com/api-keys

# 2. Update Railway environment variables with new keys
# Add PORT=8080

# 3. Push to GitHub (Railway auto-deploys)
git push origin main

# Done! Railway will deploy the streaming version automatically.
```

## 📋 What Changed

You now have **3 versions** of the search API:

| Version | File | Speed | Status |
|---------|------|-------|--------|
| **Streaming** ⭐ | `search-api-streaming.js` | < 5s perceived | **DEFAULT** |
| **Optimized** | `search-api-optimized.js` | 10-15s | Available |
| **Original** | `search-api.js` | 20-30s | Fallback |

The **streaming version** is now the default (`package.json` → `start` script).

## 🎯 Your Next Steps

### 1. Generate New API Keys (REQUIRED)

Your old keys were exposed on GitHub. Generate new ones:

**Anthropic:**
- Go to: https://console.anthropic.com/settings/keys
- Delete old key, create new: "Daily Discipline Search Production"
- Copy `sk-ant-...` key

**OpenAI:**
- Go to: https://platform.openai.com/api-keys
- Delete old key, create new: "Daily Discipline Search Production"
- Copy `sk-proj-...` key

**Circle.so:**
- Revoke old token: `AzyCRawBDXisKUyW73CgsX9JKWRCvGMf`
- Generate new token

### 2. Update Railway Environment Variables

In Railway dashboard → Variables tab:

```
ANTHROPIC_API_KEY=sk-ant-YOUR_NEW_KEY
OPENAI_API_KEY=sk-proj-YOUR_NEW_KEY
CIRCLE_API_TOKEN=YOUR_NEW_CIRCLE_TOKEN
PORT=8080
```

(Keep existing: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CIRCLE_SPACE_ID`)

### 3. Deploy to Railway

```bash
git push origin main
```

Railway automatically deploys the streaming version.

### 4. Test It

```bash
# Health check
curl https://your-app.railway.app/health

# Test streaming
curl -N -X POST https://your-app.railway.app/search/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "how to build discipline"}'
```

### 5. Update HubSpot Widget

Use the new `widget/search-widget-streaming.js` or update your existing widget to use the `/search/stream` endpoint.

```bash
# Upload to HubSpot
hs cms upload hubspot-module/dd-search.module Leap/modules/dd-search.module --account=108516
```

## ✅ Success Checklist

- [ ] New API keys generated
- [ ] Railway variables updated with new keys
- [ ] Pushed to GitHub
- [ ] Railway deployed successfully
- [ ] Health check returns 200
- [ ] Streaming endpoint works
- [ ] Response time < 5s perceived
- [ ] HubSpot widget updated
- [ ] Live test on dailydiscipline.com

## 📚 Full Documentation

- **Complete Guide:** `COMPLETE_DEPLOYMENT.md`
- **Railway Specific:** `RAILWAY_DEPLOYMENT.md`
- **Security:** `SECURITY_CHECKLIST.md`
- **Performance:** `OPTIMIZATION_GUIDE.md`

## 🆘 Troubleshooting

**API Key Error?**
- Generate new keys (old ones burned)
- Update Railway variables
- Redeploy

**Still Slow?**
- Verify using `search-api-streaming.js` (check Railway logs)
- Check Railway is using `PORT=8080`
- See `OPTIMIZATION_GUIDE.md`

**Streaming Not Working?**
- Check CORS includes your domain
- Verify endpoint is `/search/stream`
- See `RAILWAY_DEPLOYMENT.md` → Troubleshooting

## 💰 Costs

- **Railway:** $5/month (Starter plan)
- **API costs:** ~$4 per 1,000 searches
- **Total:** ~$9/month for 1,000 searches

## 🎉 Expected Results

After deployment:
- Search responds in **< 5 seconds** (perceived)
- Answer **streams in real-time** like ChatGPT
- **BK's authentic voice** in responses
- **5-7 relevant posts** returned
- **No errors** in logs
- **Happy users** on dailydiscipline.com

---

**Ready to deploy?** Follow the 5 steps above and you're live in 15 minutes!
