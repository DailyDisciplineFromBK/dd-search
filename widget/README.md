# Daily Discipline Search Widget

Frontend search widget for the Daily Discipline semantic search. Can be used standalone or embedded in HubSpot.

## Files

- **search-widget.html** - Standalone HTML page
- **search-widget.css** - Widget styles
- **search-widget.js** - Widget JavaScript
- **hubspot-embed.html** - Single-file version for HubSpot Custom HTML module
- **test-server.js** - Local test server

## Testing Locally

### 1. Start the Search API

In the main dd-search directory:

```bash
npm run dev
```

This starts the API on `http://localhost:3000`

### 2. Start the Widget Server

In a new terminal:

```bash
npm run widget
```

This starts the widget server on `http://localhost:3001`

### 3. Open in Browser

- **Standalone version:** http://localhost:3001/search-widget.html
- **HubSpot version:** http://localhost:3001/hubspot-embed.html

Both versions are fully functional and will search the API.

## Deploying to HubSpot

### Option 1: Custom HTML Module (Recommended)

1. In HubSpot, go to **Marketing** > **Files and Templates** > **Design Tools**
2. Create a new **Custom Module**
3. Add a **Rich Text** field
4. In the HTML + HubL section, paste the contents of `hubspot-embed.html`
5. Update the `API_BASE_URL` constant to your production API URL:
   ```javascript
   const API_BASE_URL = 'https://your-production-api.com';
   ```
6. Save the module
7. Add the module to any page where you want the search widget

### Option 2: Page Template

1. Create a new page template in HubSpot
2. Add the `hubspot-embed.html` code to the template
3. Update the `API_BASE_URL` to your production URL
4. Create pages using this template

## Customization

### Changing Colors

In the CSS, update these variables:

```css
/* Primary color (buttons, links, highlights) */
#2563eb → Your brand color

/* Primary hover color */
#1d4ed8 → Darker shade of brand color

/* Result relevance background */
#e0f2fe → Light shade of brand color
```

### Changing Text

In the HTML, update:

```html
<h2>Search Daily Discipline Archive</h2>
<p class="search-subtitle">Search 2,100+ posts on discipline, performance, and personal growth</p>
```

### Changing API URL

Update the `API_BASE_URL` constant:

```javascript
const API_BASE_URL = 'https://your-api-domain.com';
```

### Changing Number of Results

The API returns top 5 by default. To change this, modify the API code in `search-api.js`:

```javascript
// In synthesizeResults function, change this line:
"2. The top 5 most relevant posts" → "2. The top 10 most relevant posts"
```

## Features

- **Semantic search** - Powered by OpenAI embeddings
- **AI synthesis** - Claude analyzes and explains relevance
- **Responsive design** - Works on mobile, tablet, desktop
- **Accessible** - ARIA labels, keyboard navigation
- **Fast** - Results in ~3-5 seconds
- **Clean UI** - Professional, modern design

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Initial load: < 50KB (HTML + CSS + JS)
- No external dependencies
- Lazy loading of results
- Optimized for Core Web Vitals

## Security

- XSS protection via HTML escaping
- CORS configured on API
- No user data stored
- All searches are stateless

## Troubleshooting

### "Search failed" error

1. Check that the API is running and accessible
2. Verify the `API_BASE_URL` is correct
3. Check browser console for detailed error
4. Ensure CORS is enabled on the API

### Results not displaying

1. Check that the API is returning valid JSON
2. Open browser DevTools > Network tab
3. Look for the `/search` request
4. Verify response format matches expected structure

### Styling conflicts in HubSpot

All widget styles are prefixed with `#dd-search-widget` to avoid conflicts with HubSpot styles. If you still see conflicts:

1. Increase specificity of widget styles
2. Use `!important` as last resort
3. Check for global styles overriding widget

## Next Steps

1. Update `API_BASE_URL` to production URL
2. Deploy API to production (see main README.md)
3. Test widget in HubSpot staging environment
4. Deploy to production pages
5. Monitor search queries and performance
