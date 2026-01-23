# Security Checklist

## 🔒 Repository Security

### ✅ Completed
- [x] `.gitignore` includes `.env`
- [x] `.env` never committed to git history
- [x] `.env.example` uses placeholder values only
- [x] No API keys in tracked files

### 🚨 IMMEDIATE ACTION REQUIRED

#### 1. Revoke Exposed API Keys

Your API keys were burned by uploading to GitHub. **Immediately revoke and regenerate:**

**Anthropic (Claude):**
1. Go to: https://console.anthropic.com/settings/keys
2. Find key starting with `sk-ant-api03-...`
3. Click **"Delete"** or **"Revoke"**
4. Click **"Create Key"**
5. Name: "Daily Discipline Search Production"
6. Copy key and save securely
7. Update Railway environment variables

**OpenAI:**
1. Go to: https://platform.openai.com/api-keys
2. Find exposed key
3. Click **"Delete"** or **"Revoke"**
4. Click **"Create new secret key"**
5. Name: "Daily Discipline Search Production"
6. Copy key and save securely
7. Update Railway environment variables

**Circle.so:**
1. Go to Circle.so settings
2. Revoke token: `AzyCRawBDXisKUyW73CgsX9JKWRCvGMf`
3. Generate new token
4. Update `.env` and Railway variables

#### 2. Update Environment Variables

**Local `.env`:**
```bash
cd /Users/brentwashburn/DIGNVS/dd-search
nano .env
```

Update with NEW keys:
```
ANTHROPIC_API_KEY=sk-ant-NEW_KEY_HERE
OPENAI_API_KEY=sk-proj-NEW_KEY_HERE
CIRCLE_API_TOKEN=NEW_CIRCLE_TOKEN_HERE
```

**Railway Dashboard:**
1. Go to your Railway project
2. Click **"Variables"** tab
3. Update each variable with new keys
4. Click **"Deploy"** to restart with new keys

### 🔍 Verify No Secrets in Git

Run these commands to double-check:

```bash
# Check git history for .env
git log --all --full-history -- .env

# Search for potential API keys in all commits
git log --all -p | grep -i "sk-ant-\|sk-proj-\|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"

# Check current tracked files
git ls-files | xargs grep -l "sk-ant-\|sk-proj-" || echo "No keys found ✅"
```

If any secrets are found, you must rewrite Git history:
```bash
# WARNING: This rewrites history - coordinate with team first
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (dangerous!)
git push origin --force --all
```

## 🛡️ Code Security

### API Key Management

**✅ Current Implementation:**
```javascript
// Good: Uses environment variables
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

**❌ Never Do This:**
```javascript
// BAD: Hardcoded API key
const anthropic = new Anthropic({
  apiKey: 'sk-ant-api03-...',
});
```

### CORS Configuration

**✅ Current Implementation:**
```javascript
app.use(cors({
  origin: [
    'https://www.dailydiscipline.com',
    'https://dailydiscipline.com',
    'http://localhost:3001' // Remove in production
  ]
}));
```

**🔧 Recommended for Production:**
```javascript
app.use(cors({
  origin: [
    'https://www.dailydiscipline.com',
    'https://dailydiscipline.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

Remove `localhost` before deploying to Railway.

### Input Validation

**✅ Current Implementation:**
```javascript
if (!query || typeof query !== 'string') {
  return res.status(400).json({
    error: 'Query parameter required',
  });
}
```

**🔧 Additional Recommended:**
```javascript
// Add query length limits
if (!query || typeof query !== 'string') {
  return res.status(400).json({
    error: 'Query parameter required',
  });
}

if (query.length > 500) {
  return res.status(400).json({
    error: 'Query too long (max 500 characters)',
  });
}

// Sanitize query (remove special chars that could cause issues)
const sanitizedQuery = query.trim().replace(/[<>{}]/g, '');
```

### Rate Limiting

**⚠️ Not Currently Implemented**

Add rate limiting to prevent abuse:

```javascript
import rateLimit from 'express-rate-limit';

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: 'Too many searches, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/search', searchLimiter, async (req, res) => {
  // ... search logic
});

app.post('/search/stream', searchLimiter, async (req, res) => {
  // ... streaming logic
});
```

Install package:
```bash
npm install express-rate-limit
```

### Error Handling

**✅ Current Implementation:**
```javascript
catch (err) {
  console.error('❌ Search error:', err);
  res.status(500).json({
    error: 'Search failed',
    message: err.message,
  });
}
```

**🔧 Recommended (Don't Expose Stack Traces):**
```javascript
catch (err) {
  console.error('❌ Search error:', err);

  // Don't expose internal error details to client
  res.status(500).json({
    error: 'Search failed',
    message: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message,
  });
}
```

## 🔐 Database Security

### Supabase Configuration

**✅ Current Implementation:**
- Using service role key (full access)
- RLS (Row Level Security) should be configured in Supabase

**🔧 Recommended Supabase RLS Policies:**

```sql
-- Only allow API to read posts
CREATE POLICY "Allow API to read posts"
ON posts
FOR SELECT
USING (true);

-- Only allow API to insert search queries
CREATE POLICY "Allow API to insert search queries"
ON search_queries
FOR INSERT
WITH CHECK (true);

-- Prevent updates/deletes from API
-- (should only happen via Circle.so sync)
```

### SQL Injection Prevention

**✅ Safe Implementation:**
```javascript
// Supabase client uses parameterized queries automatically
const { data, error } = await supabase.rpc('search_posts', {
  query_embedding: queryEmbedding,
  match_count: matchCount,
  match_threshold: threshold,
});
```

**❌ Never Do Raw SQL:**
```javascript
// BAD: SQL injection risk
await supabase.rpc('search_posts', {
  query_embedding: `[${userInput}]`, // NEVER!
});
```

## 🌐 Frontend Security

### Widget Security (HubSpot)

**✅ Current Implementation:**
```javascript
// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**🔧 Additional Recommendations:**

1. **Content Security Policy (CSP)**

   Add to HubSpot template:
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="default-src 'self';
                  script-src 'self' 'unsafe-inline';
                  connect-src 'self' https://your-railway-app.railway.app;">
   ```

2. **Subresource Integrity (SRI)**

   If using external libraries:
   ```html
   <script src="https://cdn.example.com/lib.js"
           integrity="sha384-..."
           crossorigin="anonymous"></script>
   ```

3. **Sanitize All User Input**

   ```javascript
   // Always escape before displaying
   answerDiv.textContent = data.text; // Safe (textContent)
   // NOT: answerDiv.innerHTML = data.text; // Unsafe if not escaped
   ```

## 🔒 Railway Security

### Environment Variables

**✅ Best Practices:**
- All secrets stored in Railway environment variables
- Variables encrypted at rest
- Not visible in logs or build output

**🔧 Railway Settings:**
1. Go to Railway project → **Settings**
2. Under **Environment** → **Variables**
3. Verify all sensitive values are there
4. Enable **"Redact Variables in Logs"** (if available)

### HTTPS

**✅ Automatically Configured:**
- Railway provides HTTPS by default
- Certificate managed automatically
- HTTP redirects to HTTPS

### Access Control

**🔧 Recommended:**
1. Enable Railway team access controls
2. Use separate Railway accounts for dev/prod
3. Limit who can deploy to production
4. Enable 2FA on Railway account

## 📊 Monitoring & Logging

### Secure Logging

**✅ Current Implementation:**
```javascript
console.log(`🔍 Search query: "${query}"`);
console.log(`✓ Searched in ${searchTime}ms`);
```

**❌ Never Log:**
```javascript
// BAD: Don't log API keys
console.log('API key:', process.env.ANTHROPIC_API_KEY);

// BAD: Don't log full responses with potential PII
console.log('Full response:', JSON.stringify(response));
```

**🔧 Recommended:**
```javascript
// Log only non-sensitive info
console.log(`🔍 Search query: "${query.substring(0, 50)}..."`);
console.log(`✓ Found ${results.length} results`);
console.log(`⏱️ Search time: ${searchTime}ms`);

// If you must log errors, sanitize first
console.error('API error:', {
  status: error.status,
  message: error.message,
  // Don't include full error object
});
```

### Railway Log Management

1. Go to Railway → **Observability** → **Logs**
2. Filter for errors: search `❌` or `error`
3. Set up log retention (Railway keeps logs for 7 days free tier)
4. Consider external logging service for longer retention

## 🚨 Incident Response

### If API Keys Are Compromised

1. **Immediately revoke keys** (see instructions above)
2. **Generate new keys**
3. **Update Railway environment variables**
4. **Monitor API usage** for unauthorized requests
5. **Check billing** for unexpected charges
6. **Review logs** for suspicious activity

### If Database Is Compromised

1. **Rotate Supabase credentials**
2. **Review RLS policies**
3. **Check for unauthorized data access**
4. **Backup database immediately**
5. **Contact Supabase support**

### If Frontend Is Compromised

1. **Remove HubSpot module immediately**
2. **Check for XSS vulnerabilities**
3. **Review all user inputs**
4. **Clear CDN cache**
5. **Redeploy clean version**

## ✅ Pre-Deployment Security Checklist

Before deploying to Railway:

- [ ] New API keys generated (old ones revoked)
- [ ] All environment variables updated in Railway
- [ ] `.env` in `.gitignore`
- [ ] No secrets in Git history
- [ ] CORS restricted to production domain only
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose internals
- [ ] XSS protection in frontend (escapeHtml)
- [ ] HTTPS enabled (automatic with Railway)
- [ ] Logging doesn't include sensitive data
- [ ] Supabase RLS policies configured
- [ ] Health check endpoint doesn't expose secrets
- [ ] Railway access controls configured

## 📋 Monthly Security Review

Schedule monthly reviews:

- [ ] Review Railway access logs
- [ ] Check API usage for anomalies
- [ ] Verify environment variables are up to date
- [ ] Review error logs for security issues
- [ ] Test rate limiting is working
- [ ] Verify CORS is correctly configured
- [ ] Check for outdated dependencies: `npm audit`
- [ ] Review Supabase access logs
- [ ] Verify backups are working

## 🔗 Security Resources

**Best Practices:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Node.js Security: https://nodejs.org/en/docs/guides/security/

**Tools:**
- npm audit: `npm audit fix`
- Snyk: https://snyk.io
- GitHub Dependabot: (enable in repo settings)

**Support:**
- Railway Security: https://docs.railway.app/reference/security
- Supabase Security: https://supabase.com/docs/guides/platform/security
- Anthropic Security: https://docs.anthropic.com/claude/reference/security
