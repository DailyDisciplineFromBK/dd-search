# BK-Voiced Search & Analytics

The search system now includes direct answers in BK's voice and comprehensive query logging for analytics.

## What's New

### 1. Direct Answer from BK

Every search now includes a direct answer in BK's distinctive voice before showing related posts.

**Example Query:** "How do I build a Player-Lead Culture for my High School Football Team"

**BK's Answer:**
> You don't build a player-led culture by announcing it or hoping your captains figure it out. You build it by transferring ownership systematically, deliberately, every single day.
>
> Start here. Stop answering questions they should answer themselves. Stop solving problems they should solve together. When a player asks what time practice is, ask him who on the team knows. When there's confusion about a drill, let them work it out. When someone's late, let the players address it before you do. This feels uncomfortable at first. You'll want to jump in. Don't. Your restraint creates the space they need to step up.
>
> Next, make them responsible for what matters to them. Ask your players what they care about. Not what they think you want to hear. What actually matters. Team unity? Winning a championship? Getting better every day? Once you know, attach their names to it. Put them in charge of those things. Give them real authority, not fake captain duties. Let them lead meetings about it. Let them hold teammates accountable for it. Let them fail at it and learn from it.
>
> Here's what you'll discover. Players don't lead because you tell them to. They lead because they own something real, something that matters, something they chose. Compliance gets you robots. Ownership gets you leaders. Build the second one.

### 2. BK's Brand Voice Applied

The direct answer uses BK's authentic voice:

**Core Principles:**
- **Truth with Love** - Direct but never harsh
- **Simple & Actionable** - Tell them what to DO today
- **Emotional Activation** - Make them FEEL it
- **Short Sentences** - Varied rhythm (punch, punch, sing)
- **Authority Without Arrogance** - With readers, not above them
- **Visceral Language** - Make concepts feel real

**Voice Elements:**
- Short, punchy sentences
- Varied rhythm
- "You" directly addressing the reader
- Focus on specific actions, not theory
- Addresses the ROOT issue (usually discipline)
- No em dashes, no semicolons, no clichés

### 3. Enhanced Result Display

**Before:**
- Summary paragraph
- Posts with similarity percentages
- "Why it's relevant:" labels

**After:**
- Direct answer from BK (prominent blue gradient box)
- "Related Posts" section
- Similarity % hidden (used internally for ranking)
- Cleaner relevance explanations

### 4. Search Query Logging

Every search is logged to the database for analytics:

**Tracked Data:**
- Search query text
- Expanded queries (Claude's interpretation)
- Number of results
- Search time (milliseconds)
- Timestamp

**Analytics Views Available:**
- Popular searches
- Recent searches
- Daily search analytics
- Query performance metrics

## Setup: Query Logging

### 1. Run the Schema Migration

In Supabase SQL Editor, run:

```sql
-- Copy and paste contents of schema-search-queries.sql
```

Or use the Supabase CLI:

```bash
supabase db push schema-search-queries.sql
```

This creates:
- `search_queries` table
- Indexes for analytics
- `log_search_query()` function
- Analytics views: `popular_searches`, `recent_searches`, `search_analytics_daily`

### 2. Verify Setup

Check that logging is working:

```sql
-- View recent searches
SELECT * FROM recent_searches LIMIT 10;

-- View popular searches
SELECT * FROM popular_searches LIMIT 10;

-- View daily analytics
SELECT * FROM search_analytics_daily ORDER BY day DESC LIMIT 7;
```

## Analytics Queries

### Most Popular Searches

```sql
SELECT
  query,
  search_count,
  avg_results::int as avg_results,
  last_searched
FROM popular_searches
ORDER BY search_count DESC
LIMIT 20;
```

### Searches With No Results

```sql
SELECT
  query,
  created_at
FROM search_queries
WHERE results_count = 0
ORDER BY created_at DESC;
```

### Daily Search Volume

```sql
SELECT
  day::date,
  total_searches,
  unique_queries,
  avg_results::int,
  avg_time_ms::int as avg_ms
FROM search_analytics_daily
WHERE day > CURRENT_DATE - INTERVAL '30 days'
ORDER BY day DESC;
```

### Slow Searches (> 30 seconds)

```sql
SELECT
  query,
  search_time_ms / 1000.0 as seconds,
  results_count,
  created_at
FROM search_queries
WHERE search_time_ms > 30000
ORDER BY search_time_ms DESC;
```

### Query Expansion Patterns

```sql
SELECT
  query,
  expanded_queries,
  results_count
FROM search_queries
WHERE expanded_queries IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

## Testing the New Features

### Test Direct Answer

```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I build a Player-Lead Culture for my High School Football Team"}' \
  | python3 -m json.tool
```

### Test Various Topics

Try these searches to see BK's voice in action:

**Leadership:**
- "How do I build a Player-Lead Culture for my High School Football Team"
- "How to develop accountability in my team"
- "Building trust with employees"

**Personal:**
- "how to lose weight"
- "starting a business"
- "waking up early"
- "overcoming procrastination"

**Mindset:**
- "dealing with self-doubt"
- "staying motivated long term"
- "facing fear"

Each will receive a direct, actionable answer in BK's voice followed by related posts.

## Widget Display

The widget now displays:

1. **Direct Answer Box** (prominent, blue gradient)
   - "FROM BK" label
   - 2-3 paragraphs of direct advice
   - 150-250 words
   - Specific, actionable guidance

2. **Related Posts Section**
   - "Related Posts" header
   - 5-7 most relevant posts
   - Date only (no similarity %)
   - Relevance explanation for each
   - Link to full post

## Performance

- **Total search time:** 25-30 seconds
- **Query expansion:** 3-5 seconds
- **Embeddings:** 5-7 seconds (5 queries)
- **Vector searches:** <1 second
- **Direct answer:** 3-5 seconds
- **Post synthesis:** 5-10 seconds

The extra time delivers dramatically better results with BK's authentic voice.

## Cost Impact

Per search:
- **Before:** ~$0.003 (1 expansion + 1 synthesis)
- **After:** ~$0.006 (1 expansion + 1 direct answer + 1 synthesis)

For 1,000 searches/month:
- **Before:** ~$3
- **After:** ~$6

Still very affordable for the quality and brand voice consistency.

## Brand Voice Guidelines Applied

From BK's style guide, these principles shape the direct answer:

### Core Philosophy
- **Truth with Love** - Direct and honest but never harsh
- **Simple, Systematic, Timeless** - Accessible and clear
- **Emotion Over Information** - Make readers FEEL it

### Writing Technique
- **One Reader** - Write as if speaking to one person
- **Poetry That Sings** - Rhythm and cadence matter
- **Visceral Language** - Describe sensations, make concepts feel real
- **Short Sentences** - Varied rhythm, punch-punch-sing

### Content Standards
- **Simple** - Clear and free of complexity
- **Systematic** - Organized and logical
- **Timeless** - True across history and cultures

### Execution
- **What to DO** - Specific actions, not just concepts
- **Address ROOT** - Usually discipline, not surface problem
- **No Fluff** - Every word earns its place
- **Make It Real** - Not theory, but truth they can act on

## Monitoring Search Quality

Track these metrics:

1. **User Engagement**
   - Which queries get searched most?
   - Which topics have no results?
   - What are users actually looking for?

2. **Performance**
   - Average search time
   - Slow searches (> 30s)
   - Failed searches

3. **Content Gaps**
   - Queries with 0 results
   - Topics users search for but don't exist
   - Opportunities for new Daily Discipline posts

## Future Enhancements

Potential improvements:

1. **Caching** - Cache common searches for faster response
2. **User Feedback** - "Was this helpful?" rating system
3. **Follow-up Questions** - Suggest related searches
4. **Personalization** - Remember context across searches
5. **Voice Refinement** - Continuously improve BK's voice fidelity

## Support

Questions about the BK-voiced search:

- Implementation: See `search-api.js` (lines 65-158)
- Widget display: See `widget/search-widget.js` and `.css`
- HubSpot version: See `widget/hubspot-embed.html`
- Query logging: See `schema-search-queries.sql`

The system is production-ready with BK's authentic voice powering every search result.
