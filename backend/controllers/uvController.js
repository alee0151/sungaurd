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
// ---------------------------------------------------------------------------
exports.getDailyHistory = async (req, res) => {
  const view  = req.query.view  || 'monthly';
  const years = Math.min(parseInt(req.query.years || '4', 10), 10);

  try {
    if (view === 'yearly') {
      const result = await pool.query(`
        SELECT
          EXTRACT(YEAR FROM date)::int                 AS year,
          ROUND(AVG(max_uv_index)::numeric, 1)         AS "avgUv",
          ROUND(MIN(max_uv_index)::numeric, 1)         AS "minUv",
          ROUND(MAX(max_uv_index)::numeric, 1)         AS "maxUv"
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

    const monthlyResult = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM date)::int        AS month_num,
        TO_CHAR(date, 'Mon')                 AS month,
        EXTRACT(YEAR  FROM date)::int        AS year,
        ROUND(AVG(max_uv_index)::numeric, 1) AS avg_uv
      FROM daily_max_uv
      WHERE date >= NOW() - INTERVAL '1 year' * $1
      GROUP BY month_num, month, year
      ORDER BY year ASC, month_num ASC
    `, [years]);

    const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const pivoted = {};
    const yearSet = new Set();

    for (const row of monthlyResult.rows) {
      const key = row.month;
      if (!pivoted[key]) pivoted[key] = { month: key, month_num: row.month_num };
      pivoted[key][String(row.year)] = parseFloat(row.avg_uv);
      yearSet.add(String(row.year));
    }

    const data = MONTH_ORDER.filter(m => pivoted[m]).map(m => pivoted[m]);

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

// ---------------------------------------------------------------------------
// GET /education/melanoma-cases
//
// Returns annual national melanoma incidence (Persons, Australia) from the
// melanoma_cases table for the last 12 years up to and including 2019.
//
// Expected table schema:
//   melanoma_cases(id, data_type, cancer_group, year, sex, state_territory, count, ...)
// ---------------------------------------------------------------------------
exports.getMelanomaCases = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "Year"::int         AS year,
        SUM("Count")::int   AS cases
      FROM melanoma_cases
      WHERE
        "Data_Type"      = 'Incidence'
        AND "Sex"        = 'Persons'
        AND "State_Territory" = 'Australia'
        AND "Year"::int  <= 2019
        AND "Count"      IS NOT NULL
      GROUP BY year
      ORDER BY year desc
      LIMIT 12
    `);

    // Return most-recent 12 years up to 2019
    const rows = result.rows;
    const data = rows
      .slice(-12)
      .map(r => ({ year: String(r.year), cases: r.cases }))
      .sort((a, b) => Number(a.year) - Number(b.year));

    res.json({ data });
  } catch (err) {
    console.error('[getMelanomaCases]', err.message);
    res.status(500).json({ error: 'Failed to query melanoma_cases', detail: err.message });
  }
};
