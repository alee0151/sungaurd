const pool = require('../db');

// ---------------------------------------------------------------------------
// UV threshold
// ---------------------------------------------------------------------------
const HIGH_UV_THRESHOLD = 3; // UV >= 3 is considered a "high UV" situation

// ---------------------------------------------------------------------------
// UV-Aware Streak Logic
//
// A "streak day" = a calendar day where the user adequately protected themselves.
// The rules are:
//
// HIGH UV day (uv_index_at_application >= 3):
//   - User MUST apply sunscreen to earn/maintain streak
//   - If the user misses a HIGH UV day → streak RESETS
//   - If user applies → streak extends (or starts)
//
// LOW UV day (uv_index_at_application < 3 OR uv unknown):
//   - Streak is NEVER broken on low UV days (no penalty)
//   - If user applies anyway → streak EXTENDS (bonus credit)
//   - If user doesn't apply → streak stays the same (no penalty, no gain)
//
// Consecutive day check uses last_credited_date:
//   - last_credited_date == yesterday → extend
//   - last_credited_date == today     → already credited, check reapplication compliance
//   - last_credited_date older        → check if gap days were all low-UV (no penalty) or had high-UV (reset)
// ---------------------------------------------------------------------------

async function recalculateStreak(userId, uvIndex) {
  const isHighUV = typeof uvIndex === 'number' && uvIndex >= HIGH_UV_THRESHOLD;

  await pool.query(
    `INSERT INTO user_streaks (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const { rows } = await pool.query(
    `SELECT current_streak, longest_streak, last_credited_date, last_high_uv_date
     FROM user_streaks WHERE user_id = $1`,
    [userId]
  );
  const s = rows[0];

  const todayStr      = new Date().toISOString().slice(0, 10);
  const lastCredited  = s.last_credited_date
    ? new Date(s.last_credited_date).toISOString().slice(0, 10) : null;

  let newCurrent = s.current_streak;
  let newLastHighUV = s.last_high_uv_date
    ? new Date(s.last_high_uv_date).toISOString().slice(0, 10) : null;

  if (isHighUV) newLastHighUV = todayStr;

  if (lastCredited === todayStr) {
    // Already credited today — no streak change (reapplication within same day is compliance, not a new streak day)
  } else if (!lastCredited) {
    // First ever application
    newCurrent = 1;
  } else {
    const gapDays = Math.round(
      (new Date(todayStr) - new Date(lastCredited)) / 86400000
    );

    if (gapDays === 1) {
      // Consecutive day — always extend
      newCurrent += 1;
    } else {
      // Gap > 1 day. Check if any gap days were HIGH UV.
      // We approximate by checking if last_high_uv_date falls within the gap.
      // If the last high UV day is within the gap → user missed a high-UV protection window → RESET
      // If no high UV days in the gap → low UV gap → no penalty, still extend
      const lastHighUVStr = newLastHighUV;
      let gapHadHighUV = false;

      if (lastHighUVStr) {
        const lastHighUVDate = new Date(lastHighUVStr);
        const lastCreditedDate = new Date(lastCredited);
        // If the last high UV event was AFTER the last credited day but BEFORE today → gap had high UV
        if (lastHighUVDate > lastCreditedDate && lastHighUVStr !== todayStr) {
          gapHadHighUV = true;
        }
      }

      if (gapHadHighUV) {
        // Missed a high-UV day in the gap → reset
        newCurrent = 1;
      } else {
        // Gap was all low-UV → no penalty, extend streak
        newCurrent += 1;
      }
    }
  }

  const newLongest = Math.max(s.longest_streak, newCurrent);

  await pool.query(
    `UPDATE user_streaks
     SET current_streak      = $1,
         longest_streak      = $2,
         last_credited_date  = $3,
         last_high_uv_date   = $4,
         updated_at          = NOW()
     WHERE user_id = $5`,
    [newCurrent, newLongest, todayStr, newLastHighUV, userId]
  );

  return { currentStreak: newCurrent, longestStreak: newLongest };
}

// ---------------------------------------------------------------------------
// Patch the previous Application log with actual_duration_seconds
// Called each time a new Application is recorded — closes out the prior window
// ---------------------------------------------------------------------------
async function closePreviousApplicationWindow(userId, nowMs) {
  const { rows } = await pool.query(
    `SELECT id, logged_at, duration_seconds
     FROM protection_logs
     WHERE user_id = $1 AND type = 'Application' AND actual_duration_seconds IS NULL
     ORDER BY logged_at DESC
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) return;

  const prev = rows[0];
  const startMs  = new Date(prev.logged_at).getTime();
  const maxMs    = prev.duration_seconds ? prev.duration_seconds * 1000 : null;
  const elapsedMs = nowMs - startMs;
  // Actual = min(elapsed, timer duration) — never exceed what was set
  const actual = maxMs ? Math.round(Math.min(elapsedMs, maxMs) / 1000) : Math.round(elapsedMs / 1000);

  await pool.query(
    `UPDATE protection_logs SET actual_duration_seconds = $1 WHERE id = $2`,
    [actual, prev.id]
  );
}

// ---------------------------------------------------------------------------
// POST /logs
// Body: { type, message, duration_seconds, uv_index_at_application }
// ---------------------------------------------------------------------------
exports.addLog = async (req, res) => {
  const { type, message, duration_seconds, uv_index_at_application } = req.body;
  if (!type || !message)
    return res.status(400).json({ error: 'type and message are required' });
  if (!['Application', 'Alert'].includes(type))
    return res.status(400).json({ error: 'type must be Application or Alert' });

  try {
    if (type === 'Application') {
      // Close the previous open application window first
      await closePreviousApplicationWindow(req.user.id, Date.now());
    }

    const result = await pool.query(
      `INSERT INTO protection_logs
         (user_id, type, message, duration_seconds, uv_index_at_application)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, type, message, duration_seconds, actual_duration_seconds, uv_index_at_application, logged_at`,
      [req.user.id, type, message, duration_seconds || null, uv_index_at_application ?? null]
    );
    const log = result.rows[0];

    let streakUpdate = null;
    if (type === 'Application') {
      streakUpdate = await recalculateStreak(req.user.id, uv_index_at_application ?? null);
    }

    res.status(201).json({ log, streak: streakUpdate });
  } catch (err) {
    console.error('[addLog]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// PATCH /logs/close-window
// Called when the user manually stops the timer — records actual duration on the open log
// Body: { stopped_at_ms }  (epoch ms, optional — defaults to now)
// ---------------------------------------------------------------------------
exports.closeWindow = async (req, res) => {
  const nowMs = req.body.stopped_at_ms || Date.now();
  try {
    await closePreviousApplicationWindow(req.user.id, nowMs);
    res.json({ message: 'Window closed' });
  } catch (err) {
    console.error('[closeWindow]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// GET /logs
// ---------------------------------------------------------------------------
exports.getLogs = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const type  = req.query.type;
  const since = req.query.since;

  try {
    let query = `SELECT id, type, message, duration_seconds, actual_duration_seconds,
                        uv_index_at_application, logged_at
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

// ---------------------------------------------------------------------------
// DELETE /logs
// ---------------------------------------------------------------------------
exports.clearLogs = async (req, res) => {
  try {
    await pool.query('DELETE FROM protection_logs WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Logs cleared' });
  } catch (err) {
    console.error('[clearLogs]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// GET /logs/streak
// Checks if a high-UV day was missed since last credited date — if so, resets streak
// Low-UV gaps do NOT reset streak
// ---------------------------------------------------------------------------
exports.getStreak = async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO user_streaks (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id]
    );
    const { rows } = await pool.query(
      `SELECT current_streak, longest_streak, last_credited_date, last_high_uv_date
       FROM user_streaks WHERE user_id = $1`,
      [req.user.id]
    );
    const s = rows[0];

    const todayStr       = new Date().toISOString().slice(0, 10);
    const lastCredited   = s.last_credited_date
      ? new Date(s.last_credited_date).toISOString().slice(0, 10) : null;
    const lastHighUVStr  = s.last_high_uv_date
      ? new Date(s.last_high_uv_date).toISOString().slice(0, 10) : null;

    let streakBroken = false;

    if (lastCredited && lastCredited !== todayStr) {
      const gapDays = Math.round((new Date(todayStr) - new Date(lastCredited)) / 86400000);
      if (gapDays > 1 && lastHighUVStr) {
        // Check if last_high_uv_date falls in the gap
        const lastHighDate    = new Date(lastHighUVStr);
        const lastCreditDate  = new Date(lastCredited);
        if (lastHighDate > lastCreditDate && lastHighUVStr !== todayStr) {
          // High UV day was missed — reset streak
          await pool.query(
            `UPDATE user_streaks SET current_streak = 0, updated_at = NOW() WHERE user_id = $1`,
            [req.user.id]
          );
          streakBroken = true;
          return res.json({
            currentStreak:  0,
            longestStreak:  s.longest_streak,
            lastCreditedDate: lastCredited,
            lastHighUVDate:   lastHighUVStr,
            streakBroken:   true,
          });
        }
      }
    }

    res.json({
      currentStreak:   s.current_streak,
      longestStreak:   s.longest_streak,
      lastCreditedDate: lastCredited,
      lastHighUVDate:   lastHighUVStr,
      streakBroken,
    });
  } catch (err) {
    console.error('[getStreak]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};
