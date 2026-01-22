# Daily Discipline Semantic Search

Complete LLM-powered semantic search system for 2,100+ Daily Discipline posts. Built with OpenAI embeddings, Supabase pgvector, and Claude synthesis.

## Status: ✅ Production Ready

- **Database:** 2,101 posts indexed with embeddings
- **BK's Voice:** Direct answers in authentic brand voice
- **API:** Enhanced intelligent search operational
- **Widget:** Frontend ready for HubSpot
- **Sync:** Daily Circle.so sync configured
- **Intelligence:** Multi-query expansion with contextual understanding
- **Analytics:** Search query logging and insights

## Quick Start

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run database schema in Supabase (see SETUP_GUIDE.md)

# 4. Import posts (one-time)
npm run import

# 5. Start search API
npm run dev

# 6. Start widget server (separate terminal)
npm run widget
```

## Project Structure

```
dd-search/
├── schema.sql                    # Supabase database schema with pgvector
├── import-archive.js             # One-time archive import
├── sync-circle.js                # Daily Circle.so sync
├── search-api.js                 # Express search API
├── widget/
│   ├── search-widget.html        # Standalone widget
│   ├── search-widget.css         # Widget styles
│   ├── search-widget.js          # Widget JavaScript
│   ├── hubspot-embed.html        # Single-file HubSpot version
│   ├── test-server.js            # Local test server
│   └── README.md                 # Widget documentation
├── .github/workflows/
│   └── sync.yml                  # GitHub Actions daily sync
├── WHATS_NEW.md                  # Latest features summary
├── BK_VOICE_SEARCH.md            # BK's voice + analytics guide
├── SETUP_GUIDE.md                # Initial setup instructions
├── GITHUB_ACTIONS_SETUP.md       # GitHub Actions configuration
├── DEPLOYMENT.md                 # Production deployment guide
├── ENHANCED_SEARCH.md            # Intelligent search explanation
├── schema-search-queries.sql     # Query logging schema
└── package.json
```

## Features

### 💬 BK's Voice (NEW!)
- **Direct answers** - Every search gets a personal response from BK
- **Authentic brand voice** - Uses BK's style guide (truth with love, simple, actionable)
- **2-3 paragraphs** of specific guidance before showing posts
- **Tells you what to DO** - Not theory, but action steps starting today
- **Universal topics** - Leadership, culture, behavior, personal growth
- See [BK_VOICE_SEARCH.md](BK_VOICE_SEARCH.md) and [WHATS_NEW.md](WHATS_NEW.md)

### 🧠 Intelligent Search
- **Smart query expansion** - Claude understands intent and finds conceptually relevant content
- **Multi-query search** - Searches 3-5 related concepts per query
- **Contextual synthesis** - Explains exactly how each post applies to your situation
- **Universal applicability** - "how to lose weight" finds posts about discipline, habits, consistency
- See [ENHANCED_SEARCH.md](ENHANCED_SEARCH.md) for examples and details

### 📊 Search Analytics (NEW!)
- **Query logging** - Track every search automatically
- **Popular searches** - See what topics users care about most
- **Content gaps** - Identify topics with no results
- **Performance metrics** - Monitor search speed and quality
- See [BK_VOICE_SEARCH.md](BK_VOICE_SEARCH.md) for analytics queries

### Semantic Search
- **Vector similarity** using OpenAI embeddings (1536 dimensions)
- **pgvector** for fast similarity search
- **5-7 results** with similarity scores and specific relevance explanations

### Search API
- `POST /search` - Semantic search endpoint
- `GET /health` - Health check
- `GET /` - API info

### Frontend Widget
- Clean, responsive design
- Works on mobile, tablet, desktop
- Accessible (ARIA labels, keyboard navigation)
- Embeddable in HubSpot Custom HTML module
- Real-time search results

### Daily Sync
- Automated GitHub Actions workflow
- Checks Circle.so for new posts
- Generates embeddings for new content
- Updates Supabase automatically

## Usage

### Test Search API

```bash
# Start API
npm run dev

# Test search
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how to build discipline"}'
```

### Test Widget

```bash
# Start widget server
npm run widget

# Open in browser
open http://localhost:3001/search-widget.html
```

### Manual Sync

```bash
npm run sync
```

## Documentation

- **[WHATS_NEW.md](WHATS_NEW.md)** - Latest features (BK's voice + analytics)
- **[BK_VOICE_SEARCH.md](BK_VOICE_SEARCH.md)** - BK's voice implementation & analytics
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - First-time setup
- **[ENHANCED_SEARCH.md](ENHANCED_SEARCH.md)** - How intelligent search works
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to production
- **[GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)** - Configure daily sync
- **[widget/README.md](widget/README.md)** - Widget customization

## API Keys Required

| Service | Purpose | Cost |
|---------|---------|------|
| [Supabase](https://supabase.com) | Database + pgvector | Free tier |
| [OpenAI](https://platform.openai.com) | Embeddings | ~$0.02/month |
| [Anthropic](https://console.anthropic.com) | Search synthesis | ~$1.50/month |
| Circle.so | Content sync | (Already configured) |

## Deployment Options

Choose one:

1. **Railway** (Recommended) - $5/month, automatic deploys
2. **Heroku** - $7/month, reliable and simple
3. **DigitalOcean** - $5/month, good performance
4. **Self-hosted VPS** - $5/month, full control

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete guides.

## Cost Breakdown

### Development
- Free (all APIs have free tiers)

### Production (1,000 searches/month)
- Hosting: $5-7/month
- OpenAI: ~$0.10/month (5 embeddings per search)
- Anthropic: ~$5/month (2 Claude calls per search with extended context)
- **Total: ~$10-12/month**

## Architecture

```
┌─────────────────────┐
│   HubSpot Widget    │
│ (dailydiscipline.com)│
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐    ┌────────────────┐
│   Express API       │───▶│   Supabase     │
│  - /search          │    │  - PostgreSQL  │
│  - /health          │    │  - pgvector    │
└──────────┬──────────┘    └────────────────┘
           │
           ├──▶ OpenAI (embeddings)
           └──▶ Anthropic Claude (synthesis)

┌─────────────────────┐
│  GitHub Actions     │
│  (Daily Sync)       │───▶ Circle.so API
└─────────────────────┘
```

## How It Works

1. **User enters query** in widget
2. **Widget calls API** with search text
3. **API generates embedding** via OpenAI
4. **Supabase finds similar posts** using pgvector
5. **Claude analyzes results** and explains relevance
6. **API returns top 5 posts** with explanations
7. **Widget displays results** with links to full posts

## Performance

- **Total search time:** 15-25 seconds (intelligent search with query expansion)
- **Query expansion:** 3-5 seconds (Claude understanding)
- **Embedding generation:** ~5 seconds (5 queries)
- **Vector searches:** <1 second (5 searches)
- **Claude synthesis:** 5-10 seconds (analyzing 25 results)

Worth the extra time for dramatically better results!

## Security

- Environment variables for all secrets
- CORS configured for your domain only
- XSS protection via HTML escaping
- Rate limiting available (see DEPLOYMENT.md)
- HTTPS enforced in production

## Monitoring

Track these metrics:
- API response time (target: <5s)
- Error rate (target: <1%)
- Daily sync success rate
- OpenAI/Anthropic API costs

Recommended tools:
- [UptimeRobot](https://uptimerobot.com) - Free uptime monitoring
- [Sentry](https://sentry.io) - Free error tracking
- Platform logs (Railway/Heroku/etc)

## Next Steps

1. ✅ Database setup and import
2. ✅ Search API built and tested
3. ✅ Widget created and functional
4. ✅ GitHub Actions configured
5. 🔄 Deploy to production (see DEPLOYMENT.md)
6. 🔄 Add widget to HubSpot (see widget/README.md)
7. 🔄 Monitor and optimize

## Support

Questions? Check the documentation:
- Setup issues → [SETUP_GUIDE.md](SETUP_GUIDE.md)
- Deployment help → [DEPLOYMENT.md](DEPLOYMENT.md)
- Widget customization → [widget/README.md](widget/README.md)
- GitHub Actions → [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)

## License

Private project for Daily Discipline
