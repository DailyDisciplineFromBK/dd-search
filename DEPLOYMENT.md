# Daily Discipline Search - Deployment Guide

Complete guide for deploying the search system to production.

## Architecture Overview

```
┌─────────────────┐
│   HubSpot Site  │
│  (dailydiscipline.com)
│                 │
│  Search Widget  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐     ┌──────────────┐
│   Search API    │────▶│   Supabase   │
│   (Express)     │     │  (PostgreSQL │
│                 │     │  + pgvector) │
└────────┬────────┘     └──────────────┘
         │
         ├──▶ OpenAI (embeddings)
         └──▶ Anthropic (synthesis)

┌─────────────────┐
│ GitHub Actions  │
│  Daily Sync     │────▶ Circle.so API
└─────────────────┘
```

## Deployment Options

### Option 1: Railway (Recommended for Simplicity)

**Pros:** Easy setup, automatic deploys, generous free tier
**Cons:** May need to upgrade for production traffic

#### Steps:

1. **Sign up at railway.app**

2. **Create new project from GitHub**
   - Connect your GitHub account
   - Select dd-search repository
   - Railway will detect Node.js automatically

3. **Add environment variables**
   - Go to project settings > Variables
   - Add all variables from your `.env` file:
     ```
     SUPABASE_URL
     SUPABASE_SERVICE_KEY
     OPENAI_API_KEY
     ANTHROPIC_API_KEY
     CIRCLE_API_TOKEN
     CIRCLE_SPACE_ID
     PORT=3000
     ```

4. **Configure start command**
   - In settings, set Start Command: `node search-api.js`

5. **Deploy**
   - Railway will auto-deploy
   - Get your public URL: `https://your-app.railway.app`

6. **Enable CORS**
   - In `search-api.js`, update CORS to allow your domain:
   ```javascript
   app.use(cors({
     origin: ['https://dailydiscipline.com', 'https://www.dailydiscipline.com']
   }));
   ```

#### Cost: ~$5/month for production use

---

### Option 2: Heroku

**Pros:** Reliable, well-documented, easy to scale
**Cons:** No free tier (starts at $7/month)

#### Steps:

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku
   ```

2. **Create Heroku app**
   ```bash
   cd dd-search
   heroku create your-app-name
   ```

3. **Add environment variables**
   ```bash
   heroku config:set SUPABASE_URL="your-url"
   heroku config:set SUPABASE_SERVICE_KEY="your-key"
   heroku config:set OPENAI_API_KEY="your-key"
   heroku config:set ANTHROPIC_API_KEY="your-key"
   heroku config:set CIRCLE_API_TOKEN="your-token"
   heroku config:set CIRCLE_SPACE_ID="1669386"
   ```

4. **Create Procfile**
   ```bash
   echo "web: node search-api.js" > Procfile
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

6. **Open app**
   ```bash
   heroku open
   ```

#### Cost: $7-25/month depending on dyno type

---

### Option 3: DigitalOcean App Platform

**Pros:** Affordable, good performance, simple scaling
**Cons:** Requires more setup than Railway

#### Steps:

1. **Create account at digitalocean.com**

2. **Create new App**
   - Connect GitHub repository
   - Select dd-search repo

3. **Configure app**
   - Build Command: `npm install`
   - Run Command: `node search-api.js`
   - HTTP Port: 3000

4. **Add environment variables**
   - In app settings, add all env vars from `.env`

5. **Deploy**
   - DigitalOcean will build and deploy
   - Get URL: `https://your-app.ondigitalocean.app`

#### Cost: $5-12/month

---

### Option 4: Self-Hosted VPS (Advanced)

**Pros:** Full control, cheapest at scale
**Cons:** Requires server management, SSL setup, monitoring

#### Requirements:
- Ubuntu 22.04 VPS
- Domain name
- SSH access

#### Quick Setup:

```bash
# SSH into server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone repository
git clone https://github.com/YOUR_USERNAME/dd-search.git
cd dd-search

# Install dependencies
npm install

# Create .env file
nano .env
# (paste your environment variables)

# Start with PM2
pm2 start search-api.js --name dd-search
pm2 save
pm2 startup

# Install nginx
apt-get install -y nginx certbot python3-certbot-nginx

# Configure nginx (see nginx config below)
nano /etc/nginx/sites-available/dd-search

# Enable site
ln -s /etc/nginx/sites-available/dd-search /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Get SSL certificate
certbot --nginx -d api.yourdomain.com
```

#### Nginx Configuration:

```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Cost: $5-6/month for basic VPS

---

## Post-Deployment Steps

### 1. Update Widget API URL

In `widget/hubspot-embed.html`, change:

```javascript
const API_BASE_URL = 'http://localhost:3000';
```

To:

```javascript
const API_BASE_URL = 'https://your-production-url.com';
```

### 2. Test the API

```bash
curl -X POST https://your-production-url.com/search \
  -H "Content-Type: application/json" \
  -d '{"query": "how to build discipline"}'
```

Should return JSON with search results.

### 3. Test Health Check

```bash
curl https://your-production-url.com/health
```

Should return:
```json
{"status":"ok","timestamp":"2026-01-22T..."}
```

### 4. Deploy Widget to HubSpot

1. Update `hubspot-embed.html` with production API URL
2. Create Custom HTML module in HubSpot
3. Paste the updated code
4. Test on a staging page
5. Deploy to production pages

### 5. Set Up GitHub Actions

Follow [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) to enable daily sync.

### 6. Monitor Performance

**Track these metrics:**
- API response time (should be < 5 seconds)
- Error rate (should be < 1%)
- Daily sync success rate
- OpenAI/Anthropic API costs

**Recommended monitoring tools:**
- Uptime monitoring: UptimeRobot (free)
- Error tracking: Sentry (free tier)
- Logs: Platform-specific (Railway/Heroku/etc)

---

## Security Checklist

- [ ] All API keys stored as environment variables (not in code)
- [ ] CORS configured to allow only your domain
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting enabled (see below)
- [ ] `.env` file in `.gitignore`
- [ ] Supabase RLS policies configured (if needed)

### Enable Rate Limiting

Add to `search-api.js`:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/search', limiter);
```

Install dependency:
```bash
npm install express-rate-limit
```

---

## Cost Estimates (Monthly)

### API Hosting
- **Railway:** $5 (starter tier)
- **Heroku:** $7 (Basic dyno)
- **DigitalOcean:** $5 (Basic app)
- **VPS:** $5-6 (Linode/DigitalOcean droplet)

### APIs (based on 1000 searches/month)
- **OpenAI embeddings:** ~$0.02 (dirt cheap)
- **Anthropic Claude:** ~$1.50 (1000 requests × 500 tokens avg)
- **Supabase:** Free (well within limits)

### Total: $6-15/month

---

## Scaling Considerations

### If you get 10,000+ searches/month:

1. **Add caching**
   - Cache common search queries
   - Use Redis or in-memory cache
   - Can reduce API costs by 50-80%

2. **Optimize embeddings**
   - Pre-compute embeddings for common queries
   - Use smaller embedding model if accuracy allows

3. **Database optimization**
   - Add more indexes
   - Tune pgvector parameters
   - Consider read replicas

4. **CDN for widget**
   - Host widget assets on CDN
   - Faster load times worldwide

---

## Rollback Plan

If something goes wrong:

1. **Railway/Heroku/DigitalOcean:**
   - Go to deployments
   - Click "Rollback" to previous version

2. **Self-hosted:**
   ```bash
   pm2 stop dd-search
   git reset --hard HEAD~1
   npm install
   pm2 restart dd-search
   ```

3. **Widget:**
   - Revert HubSpot module to previous version
   - Or update API_BASE_URL back to previous endpoint

---

## Support

If you run into issues:

1. Check logs on your hosting platform
2. Test API locally: `npm run dev`
3. Verify all environment variables are set
4. Check API quotas (OpenAI, Anthropic)
5. Review Supabase connection

## Next Steps

1. Choose hosting platform
2. Deploy API
3. Update widget with production URL
4. Deploy widget to HubSpot
5. Set up GitHub Actions
6. Monitor for 24-48 hours
7. Announce to users!
