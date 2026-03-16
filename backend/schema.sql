-- SunGuard database schema
-- All statements use IF NOT EXISTS — safe to re-run on every startup.

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(100) UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  skin_type    INTEGER DEFAULT 3,
  location     VARCHAR(255),
  created_at   TIMESTAMPTZ DEFAULT NOW()
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
