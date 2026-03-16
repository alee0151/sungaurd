-- SunGuard database schema
-- Run once to initialise all tables.
-- server.js executes this automatically on startup via initDb().

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(100) UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,          -- store hashed passwords only
  skin_type    INTEGER DEFAULT 3,              -- Fitzpatrick scale 1-6
  location     VARCHAR(255),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Sunscreen reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  label        VARCHAR(255) NOT NULL,
  remind_at    TIME NOT NULL,                  -- e.g. '09:00'
  days         TEXT[],                         -- e.g. ARRAY['Mon','Tue']
  enabled      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- UV exposure log
CREATE TABLE IF NOT EXISTS uv_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  uv_index     NUMERIC(4,1) NOT NULL,
  location     VARCHAR(255),
  logged_at    TIMESTAMPTZ DEFAULT NOW()
);
