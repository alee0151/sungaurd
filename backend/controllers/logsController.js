const pool = require('../db');

// ---------------------------------------------------------------------------
// Streak maintenance logic
//
// Rules:
//   - A "streak day" = any calendar day (in the user's local timezone, we use
//     UTC date here for simplicity) where at least one Application log exists.
//   - Logging an application TODAY:
//       * If last_applied_date == yesterday  → current_streak += 1
//       * If last_applied_date == today      → no change (already counted)
//       * Otherwise (gap or first time)      → reset to 1
//   - longest_streak is updated whenever current_streak exceeds it.
// ---------------------------------------------------------------------------

async function recalculateStreak(userId, client) {
  const db = client || pool;

  // Ensure streak row exists
  await db.query(
    `INSERT INTO user_streaks (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const { rows } = await db.query(
    'SELECT current_streak, longest_streak, last_applied_date FROM user_streaks WHERE user_id = $1',
    [userId]
  );
  const streak = rows[0];

  // Today's date as YYYY-MM-DD (UTC)
  const todayStr = new Date().toISOString().slice(0, 10);
  const today    = new Date(todayStr);

  const lastDateStr = streak.last_applied_date
    ? new Date(streak.last_applied_date).toISOString().slice(0, 10)
    : null;

  let newCurrent = streak.current_streak;

  if (lastDateStr === todayStr) {
    // Already logged today — no streak change
  } else if (lastDateStr) {
    const last      = new Date(lastDateStr);
    const diffDays  = Math.round((today - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      // Consecutive day — extend streak
      newCurrent += 1;
    } else {
      // Gap detected — reset streak
      newCurrent = 1;
    }
  } else {
    // First ever application
    newCurrent = 1;
  }

  const newLongest = Math.max(streak.longest_streak, newCurrent);

  await db.query(
    `UPDATE user_streaks
     SET current_streak   = $1,
         longest_streak   = $2,
         last_applied_date = $3,
         updated_at        = NOW()
     WHERE user_id = $4`,
    [newCurrent, newLongest, todayStr, userId]
  );

  return { currentStreak: newCurrent, longestStreak: newLongest };
}

// POST /logs  — record a new protection event
exports.addLog = async (req, res) => {
  const { type, message, duration_seconds } = req.body;
  if (!type || !message)
    return res.status(400).json({ error: 'type and message are required' });
  if (!['Application', 'Alert'].includes(type))
    return res.status(400).json({ error: 'type must be Application or Alert' });

  try {
    const result = await pool.query(
      `INSERT INTO protection_logs (user_id, type, message, duration_seconds)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, message, duration_seconds, logged_at`,
      [req.user.id, type, message, duration_seconds || null]
    );
    const log = result.rows[0];

    // Update streak only for Application events
    let streakUpdate = null;
    if (type === 'Application') {
      streakUpdate = await recalculateStreak(req.user.id);
    }

    res.status(201).json({ log, streak: streakUpdate });
  } catch (err) {
    console.error('[addLog]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /logs  — fetch logs for the authenticated user
// Query params: ?limit=50&type=Application&since=2024-01-01
exports.getLogs = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const type  = req.query.type;  // optional filter
  const since = req.query.since; // optional ISO date filter

  try {
    let query = `SELECT id, type, message, duration_seconds, logged_at
                 FROM protection_logs WHERE user_id = $1`;
    const params = [req.user.id];

    if (type && ['Application', 'Alert'].includes(type)) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    if (since) {
      params.push(since);
      query += ` AND logged_at >= $${params.length}`;
    }
    params.push(limit);
    query += ` ORDER BY logged_at DESC LIMIT $${params.length}`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[getLogs]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /logs  — clear all logs for the authenticated user
exports.clearLogs = async (req, res) => {
  try {
    await pool.query('DELETE FROM protection_logs WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Logs cleared' });
  } catch (err) {
    console.error('[clearLogs]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /logs/streak  — return current and longest streak for the user
exports.getStreak = async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO user_streaks (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id]
    );
    const { rows } = await pool.query(
      'SELECT current_streak, longest_streak, last_applied_date FROM user_streaks WHERE user_id = $1',
      [req.user.id]
    );
    const s = rows[0];

    // Detect broken streak: if last_applied_date was more than 1 day ago, reset
    const todayStr    = new Date().toISOString().slice(0, 10);
    const lastDateStr = s.last_applied_date
      ? new Date(s.last_applied_date).toISOString().slice(0, 10)
      : null;

    if (lastDateStr && lastDateStr !== todayStr) {
      const diffDays = Math.round(
        (new Date(todayStr) - new Date(lastDateStr)) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 1) {
        // Streak broken — reset
        await pool.query(
          `UPDATE user_streaks SET current_streak = 0, updated_at = NOW() WHERE user_id = $1`,
          [req.user.id]
        );
        return res.json({
          currentStreak:   0,
          longestStreak:   s.longest_streak,
          lastAppliedDate: lastDateStr,
          streakBroken:    true,
        });
      }
    }

    res.json({
      currentStreak:   s.current_streak,
      longestStreak:   s.longest_streak,
      lastAppliedDate: lastDateStr,
      streakBroken:    false,
    });
  } catch (err) {
    console.error('[getStreak]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
