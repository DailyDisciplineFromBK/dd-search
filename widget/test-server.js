#!/usr/bin/env node
/**
 * Simple static file server for testing the widget
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Serve static files from widget directory
app.use(express.static(__dirname));

// Start server
app.listen(PORT, () => {
  console.log('Widget Test Server');
  console.log('==================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nViews:');
  console.log(`  Standalone: http://localhost:${PORT}/search-widget.html`);
  console.log(`  HubSpot:    http://localhost:${PORT}/hubspot-embed.html`);
  console.log('\nMake sure the Search API is running on http://localhost:3000\n');
});
