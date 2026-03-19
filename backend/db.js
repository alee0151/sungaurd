/**
 * PostgreSQL connection pool.
 * Reads DATABASE_URL from environment — set this in your Render backend service
 * environment variables using the Internal Database URL shown in your Render
 * Postgres dashboard:
 *
 *   DATABASE_URL=postgresql://sungaurd_db_user:<password>@dpg-d6r66u75gffc73f40qgg-a/sungaurd_db
 *
 * The pool is shared across all controllers via a single require('./db').
 */
const { Pool } = require('pg');
console.log(process.env.DATABASE_URL)
if (!process.env.DATABASE_URL) {
  console.warn(
    '[db] WARNING: DATABASE_URL is not set. Database features will not work.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render internal connections don't need SSL; external (local dev) do
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

module.exports = pool;
