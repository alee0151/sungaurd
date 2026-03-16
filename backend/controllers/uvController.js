const rules = require('../data/recommendationRules');

exports.getRecommendation = (req, res) => {
  const uvLevel = parseFloat(req.query.uvLevel);
  if (isNaN(uvLevel)) return res.status(400).json({ error: 'Invalid uvLevel' });
  const rule = rules.find(r => uvLevel <= r.max);
  if (!rule) return res.status(500).json({ error: 'No recommendation rule found' });
  res.json(rule);
};

// ---------------------------------------------------------------------------
// GET /uv/historical?lat=<lat>&lon=<lon>&years=4
//
// Fetches daily UV index max from Open-Meteo Historical Climate API
// (free, no API key required) and returns two aggregated structures:
//
//   monthly: [{ month: "Jan", "2021": 11.2, "2022": 11.5, ... }, ...]  (12 rows)
//   yearly:  [{ year: "2021", avgUv: 7.1 }, ...]                         (N rows)
//
// Falls back to Melbourne defaults if no lat/lon provided.
// In-memory cache per location keyed by "lat,lon" — expires after 24 hours.
// ---------------------------------------------------------------------------

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CACHE   = new Map(); // key: "lat,lon" -> { data, fetchedAt }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchHistoricalFromOpenMeteo(lat, lon, years) {
  const endYear   = new Date().getFullYear() - 1; // last complete year
  const startYear = endYear - years + 1;

  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude',        lat);
  url.searchParams.set('longitude',       lon);
  url.searchParams.set('start_date',      `${startYear}-01-01`);
  url.searchParams.set('end_date',        `${endYear}-12-31`);
  url.searchParams.set('daily',           'uv_index_max');
  url.searchParams.set('timezone',        'auto');
  url.searchParams.set('timeformat',      'iso8601');

  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`Open-Meteo error: ${resp.status}`);
  return resp.json();
}

function aggregateOpenMeteoResponse(json) {
  const dates  = json.daily.time;          // ["2021-01-01", ...]
  const values = json.daily.uv_index_max;  // [11.2, ...]

  // Group by year+month
  // buckets[year][monthIndex] = [uvValues...]
  const buckets = {};
  dates.forEach((dateStr, i) => {
    const uv = values[i];
    if (uv === null || uv === undefined) return;
    const [yearStr, monthStr] = dateStr.split('-');
    const year  = yearStr;
    const month = parseInt(monthStr, 10) - 1; // 0-indexed
    if (!buckets[year]) buckets[year] = Array.from({ length: 12 }, () => []);
    buckets[year][month].push(uv);
  });

  const years = Object.keys(buckets).sort();

  // Monthly rows: [{ month: "Jan", "2021": 11.2, ... }, ...]
  const monthly = MONTHS.map((month, mi) => {
    const row = { month };
    years.forEach(yr => {
      const vals = buckets[yr]?.[mi] || [];
      row[yr] = vals.length
        ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
        : null;
    });
    return row;
  });

  // Yearly rows: [{ year: "2021", avgUv: 7.1 }, ...]
  const yearly = years.map(yr => {
    const all = Object.values(buckets[yr]).flat();
    const avg = all.length
      ? parseFloat((all.reduce((a, b) => a + b, 0) / all.length).toFixed(1))
      : null;
    return { year: yr, avgUv: avg };
  });

  return { monthly, yearly, years };
}

exports.getHistoricalUV = async (req, res) => {
  // Default to Melbourne, AU if no coordinates provided
  const lat   = parseFloat(req.query.lat  ?? '-37.8136');
  const lon   = parseFloat(req.query.lon  ?? '144.9631');
  const years = Math.min(parseInt(req.query.years ?? '4', 10), 10);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Invalid lat/lon' });
  }

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${years}`;
  const cached   = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return res.json({ ...cached.data, cached: true });
  }

  try {
    const raw  = await fetchHistoricalFromOpenMeteo(lat, lon, years);
    const data = aggregateOpenMeteoResponse(raw);
    CACHE.set(cacheKey, { data, fetchedAt: Date.now() });
    res.json({ ...data, cached: false });
  } catch (err) {
    console.error('[getHistoricalUV]', err.message);
    res.status(502).json({ error: 'Failed to fetch historical UV data', detail: err.message });
  }
};
