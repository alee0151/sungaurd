-- SunGuard database schema
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS — safe to re-run.

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(100) UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  nickname     VARCHAR(100),
  skin_type    INTEGER DEFAULT NULL,
  location     VARCHAR(255),
  onboarded    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if upgrading an existing database
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname  VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS reminders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  label        VARCHAR(255) NOT NULL,
  remind_at    TIME NOT NULL,
  days         TEXT[],
  enabled      BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uv_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  uv_index     NUMERIC(4,1) NOT NULL,
  location     VARCHAR(255),
  logged_at    TIMESTAMPTZ DEFAULT NOW()
);
