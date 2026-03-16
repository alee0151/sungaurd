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
-- actual_duration_seconds = how long the user was actually protected before next application or timer stop
CREATE TABLE IF NOT EXISTS protection_logs (
  id                       SERIAL PRIMARY KEY,
  user_id                  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type                     VARCHAR(20) NOT NULL CHECK (type IN ('Application', 'Alert')),
  message                  VARCHAR(255) NOT NULL,
  duration_seconds         INTEGER,          -- timer duration set at time of application
  actual_duration_seconds  INTEGER,          -- actual seconds protected (filled when next application logged or timer stopped)
  uv_index_at_application  NUMERIC(4,1),     -- UV index recorded at time of application
  logged_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE protection_logs ADD COLUMN IF NOT EXISTS actual_duration_seconds INTEGER;
ALTER TABLE protection_logs ADD COLUMN IF NOT EXISTS uv_index_at_application NUMERIC(4,1);

-- UV-aware streak logic
-- A streak day requires: at least one Application during a HIGH UV window (uv >= 3)
--   AND the reapplication interval was respected (reapplied within timer duration on high-UV days)
-- On LOW UV days (uv < 3) the streak is never broken but CAN be extended if the user applies
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id               INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak        INTEGER NOT NULL DEFAULT 0,
  longest_streak        INTEGER NOT NULL DEFAULT 0,
  last_credited_date    DATE,        -- last date a streak point was earned
  last_high_uv_date     DATE,        -- last date user was in a high-UV situation
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_streaks ADD COLUMN IF NOT EXISTS last_credited_date DATE;
ALTER TABLE user_streaks ADD COLUMN IF NOT EXISTS last_high_uv_date DATE;

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
