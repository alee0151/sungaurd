-- SunGuard database schema
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

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

ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname  VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

-- Protection activity logs (sunscreen applications + alerts)
CREATE TABLE IF NOT EXISTS protection_logs (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type             VARCHAR(20) NOT NULL CHECK (type IN ('Application', 'Alert')),
  message          VARCHAR(255) NOT NULL,
  duration_seconds INTEGER,                    -- how long protection lasts
  logged_at        TIMESTAMPTZ DEFAULT NOW()
);

-- One row per user — stores streak counters and last application date
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak   INTEGER NOT NULL DEFAULT 0,
  longest_streak   INTEGER NOT NULL DEFAULT 0,
  last_applied_date DATE,                      -- date of most recent Application log
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

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
