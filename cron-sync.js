#!/usr/bin/env node
/**
 * Railway Cron Job - Daily Circle Sync
 * This runs as a separate Railway service on a schedule
 */

import syncCircle from './sync-circle.js';

console.log('🕐 Starting scheduled Circle sync...');
console.log(`Time: ${new Date().toISOString()}`);

syncCircle()
  .then(() => {
    console.log('✅ Cron sync completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Cron sync failed:', err);
    process.exit(1);
  });
