const rules = require('../data/recommendationRules');
const pool  = require('../db');

exports.getRecommendation = (req, res) => {
  const uvLevel = parseFloat(req.query.uvLevel);
  if (isNaN(uvLevel)) return res.status(400).json({ error: 'Invalid uvLevel' });
  const rule = rules.find(r => uvLevel <= r.max);
  if (!rule) return res.status(500).json({ error: 'No recommendation rule found' });
  res.json(rule);
};

// ---------------------------------------------------------------------------
// GET /uv/daily-history?view=monthly|yearly&years=4
//
// Reads from the `daily_max_uv` table (columns: id, date, max_uv_index)
// and returns aggregated UV data.
//
// view=monthly  -> 12 rows, one per month, averaged across all years
//                  [{ month: "Jan", avgUv: 11.2, year_2021: 11.0, year_2022: 11.4, ... }]
// view=yearly   -> N rows, one per calendar year
//                  [{ year: "2021", avgUv: 7.1, minUv: 2.1, maxUv: 13.0 }]
//
// Default: view=monthly, years=4 (most recent complete years)
// ---------------------------------------------------------------------------
exports.getDailyHistory = async (req, res) => {
  const view  = req.query.view  || 'monthly';
  const years = Math.min(parseInt(req.query.years || '4', 10), 10);

  try {
    if (view === 'yearly') {
      // Annual average / min / max from daily_max_uv
      const result = await pool.query(`
        SELECT
          EXTRACT(YEAR FROM date)::int   AS year,
          ROUND(AVG(max_uv_index)::numeric, 1) AS "avgUv",
          ROUND(MIN(max_uv_index)::numeric, 1) AS "minUv",
          ROUND(MAX(max_uv_index)::numeric, 1) AS "maxUv"
        FROM daily_max_uv
        WHERE date >= NOW() - INTERVAL '1 year' * $1
        GROUP BY year
        ORDER BY year ASC
      `, [years]);

      return res.json({
        view: 'yearly',
        data: result.rows.map(r => ({ ...r, year: String(r.year) })),
      });
    }

    // Monthly view — average per calendar month across all years in range
    const monthlyResult = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM date)::int              AS month_num,
        TO_CHAR(date, 'Mon')                       AS month,
        EXTRACT(YEAR  FROM date)::int              AS year,
        ROUND(AVG(max_uv_index)::numeric, 1)       AS avg_uv
      FROM daily_max_uv
      WHERE date >= NOW() - INTERVAL '1 year' * $1
      GROUP BY month_num, month, year
      ORDER BY year ASC, month_num ASC
    `, [years]);

    // Pivot: build [{ month: "Jan", month_num: 1, "2021": 11.2, "2022": 11.5 ... }, ...]
    const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const pivoted: Record<string, any> = {};
    const yearSet = new Set<string>();

    for (const row of monthlyResult.rows) {
      const key = row.month;
      if (!pivoted[key]) pivoted[key] = { month: key, month_num: row.month_num };
      pivoted[key][String(row.year)] = parseFloat(row.avg_uv);
      yearSet.add(String(row.year));
    }

    const data = MONTH_ORDER
      .filter(m => pivoted[m])
      .map(m => pivoted[m]);

    return res.json({
      view: 'monthly',
      years: Array.from(yearSet).sort(),
      data,
    });
  } catch (err) {
    console.error('[getDailyHistory]', err.message);
    res.status(500).json({ error: 'Failed to query daily_max_uv', detail: err.message });
  }
};
