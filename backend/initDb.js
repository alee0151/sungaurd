/**
 * Reads schema.sql and runs it against the connected database.
 * Called once from server.js on startup — safe to run multiple times
 * because all CREATE TABLE statements use IF NOT EXISTS.
 */
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function initDb() {
  console.log(process.env.DATABASE_URL)
  if (!process.env.DATABASE_URL) {
    console.log('[initDb] Skipping schema init — DATABASE_URL not set.');
    return;
  }
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('[initDb] Schema initialised successfully.');
  } catch (err) {
    console.error('[initDb] Failed to initialise schema:', err.message);
  }
}

module.exports = initDb;
