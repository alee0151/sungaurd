import { Info, AlertCircle, TrendingUp } from "lucide-react";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,//zzx
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Static fallback: national melanoma incidence (Persons, Australia) 2008–2019
// Source: AIHW melanoma_cases table
// ---------------------------------------------------------------------------
const FALLBACK_CANCER_DATA = [
  { year: "2008", cases: 11136 },
  { year: "2009", cases: 11312 },
  { year: "2010", cases: 11513 },
  { year: "2011", cases: 11645 },
  { year: "2012", cases: 12239 },
  { year: "2013", cases: 12873 },
  { year: "2014", cases: 13204 },
  { year: "2015", cases: 13725 },
  { year: "2016", cases: 14537 },
  { year: "2017", cases: 14962 },
  { year: "2018", cases: 15135 },
  { year: "2019", cases: 15628 },
];

const behaviourData = [
  { behaviour: "Sunscreen use",       percentage: 67 },
  { behaviour: "Wearing hats",         percentage: 52 },
  { behaviour: "Seeking shade",        percentage: 60 },
  { behaviour: "Protective clothing",  percentage: 44 },
  { behaviour: "Sunglasses",           percentage: 72 },
  { behaviour: "Avoiding peak hours",  percentage: 34 },
];

const BEHAVIOUR_COLORS = [
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#F59E0B",
  "#FBBF24",
  "#34D399",
];

const myths = [
  { emoji: "\u2601\ufe0f",        myth: "You can't get sunburned on a cloudy day",     truth: "Up to 80% of UV rays can penetrate clouds. You still need sun protection on overcast days." },
  { emoji: "\ud83d\udc65",       myth: "Only fair-skinned people need sun protection", truth: "People of all skin types can experience UV damage and are at risk for skin cancer. Everyone needs protection." },
  { emoji: "\ud83d\ude0e",       myth: "A tan is healthy and provides protection",     truth: "A tan is actually a sign of skin damage. It provides minimal protection (equivalent to SPF 2-4) and increases cancer risk." },
  { emoji: "\ud83e\uddf4",       myth: "Sunscreen prevents vitamin D production",     truth: "Even with sunscreen, you still produce vitamin D. Only 10-15 minutes of sun exposure a few times per week is needed." },
  { emoji: "\u2744\ufe0f",       myth: "You don't need sunscreen in winter",          truth: "UV rays are present year-round. Snow can reflect up to 80% of UV rays, increasing exposure during winter." },
];

const facts = [
  { emoji: "\ud83c\udf0f",            title: "Australia's UV Levels",  text: "Australia has some of the highest UV radiation levels in the world due to the ozone hole over Antarctica and clear atmospheric conditions.", bg: "bg-[#fff7ed]" },
  { emoji: "\u23f0",                  title: "Timing Matters",         text: "UV radiation is strongest between 10 AM and 4 PM. Even on cloudy days, up to 80% of UV rays can reach your skin.",                         bg: "bg-[#eff6ff]" },
  { emoji: "\ud83e\uddf4",           title: "Sunscreen Application",  text: "Most people apply only 25-50% of the recommended amount of sunscreen. Use about 1 teaspoon per limb and body area.",                     bg: "bg-[#fef3c7]" },
  { emoji: "\ud83d\udc41\ufe0f",    title: "Eye Protection",         text: "UV exposure can damage your eyes and increase the risk of cataracts. Always wear sunglasses that block 99-100% of UV rays.",            bg: "bg-[#fef2f2]" },
];

const YEAR_PALETTE: Record<string, string> = {};
const PALETTE = ["#F59E0B", "#FF6900", "#FB2C36", "#9810FA", "#155dfc", "#00C950"];

type HistView = "monthly" | "yearly";
interface MonthlyRow  { month: string; month_num?: number; [year: string]: any; }
interface YearlyRow   { year: string; avgUv: number; minUv: number; maxUv: number; }
interface MonthlyResp { view: "monthly"; years: string[]; data: MonthlyRow[]; }
interface YearlyResp  { view: "yearly";  data: YearlyRow[]; }
type HistResp = MonthlyResp | YearlyResp;

interface CancerRow { year: string; cases: number; }

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function EducationPage() {
  // --- Historical UV state ---
  const [histView,    setHistView]    = useState<HistView>("monthly");
  const [histData,    setHistData]    = useState<HistResp | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histError,   setHistError]   = useState<string | null>(null);
  const [years,       setYears]       = useState<string[]>([]);

  // --- Melanoma cases state ---
  const [cancerData,    setCancerData]    = useState<CancerRow[]>(FALLBACK_CANCER_DATA);
  const [cancerLoading, setCancerLoading] = useState(false);
  const [cancerSource,  setCancerSource]  = useState<"db" | "fallback">("fallback");

  // Fetch historical UV
  useEffect(() => {
    if (!backendUrl) return;
    setHistLoading(true);
    setHistError(null);
    fetch(`${backendUrl}/uv/daily-history?view=${histView}&years=4`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: HistResp) => {
        setHistData(d);
        if (d.view === "monthly") {
          d.years.forEach((yr, i) => { YEAR_PALETTE[yr] = PALETTE[i % PALETTE.length]; });
          setYears(d.years);
        } else {
          d.data.forEach((row, i) => { YEAR_PALETTE[row.year] = PALETTE[i % PALETTE.length]; });
          setYears(d.data.map(r => r.year));
        }
      })
      .catch(err => setHistError(err.message))
      .finally(() => setHistLoading(false));
  }, [histView]);

  // Fetch melanoma cases from DB
  useEffect(() => {
    if (!backendUrl) return;
    setCancerLoading(true);
    fetch(`${backendUrl}/education/melanoma-cases`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: { data: CancerRow[] }) => {
        if (d.data && d.data.length > 0) {
          setCancerData(d.data);
          setCancerSource("db");
        }
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => setCancerLoading(false));
  }, []);

  const HistTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-[13px] min-w-[140px]">
        <p className="text-[#6B7280] font-semibold mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span className="text-[#4a5565]">{p.name}</span>
            </span>
            <span className="font-bold" style={{ color: p.color }}>{p.value ?? "\u2013"}</span>
          </div>
        ))}
      </div>
    );
  };

  const CancerTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-[13px]">
        <p className="text-[#6B7280] font-semibold mb-1">{label}</p>
        <p className="font-bold text-[#EF4444]">{payload[0].value?.toLocaleString()} cases</p>
      </div>
    );
  };

  const firstYear = cancerData[0]?.year;
  const lastYear  = cancerData[cancerData.length - 1]?.year;
  const firstCount = cancerData[0]?.cases ?? 0;
  const lastCount  = cancerData[cancerData.length - 1]?.cases ?? 0;
  const growthPct  = firstCount > 0 ? Math.round(((lastCount - firstCount) / firstCount) * 100) : 0;

  const [showHistChart, setShowHistChart] = useState(false);
  const [showCancerChart, setShowCancerChart] = useState(false);
  const [showBehaviourChart, setShowBehaviourChart] = useState(false);//zzx
  return (
    <div className="flex flex-col gap-6">
      {/* Historical UV Index from DB */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-[#F54900]" />
              <h3
                className="text-[#0a0a0a] text-[16px]"
                style={{ fontWeight: 500 }}
              >
                Historical UV Index
              </h3>
            </div>
            <p className="text-[#717182] text-[14px] mt-1">
              UV exposure is not only a summer issue in Australia. High UV can
              still occur across many months, which means sun protection matters
              more often than users may expect.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowHistChart((prev) => !prev)}
            className="shrink-0 px-3 py-2 text-[13px] font-medium rounded-lg border border-black/10 text-[#4a5565] hover:text-[#FF6900] hover:border-[#FF6900] hover:bg-orange-50 transition-colors cursor-pointer"
          >
            {showHistChart ? "Hide chart" : "See chart"}
          </button>
        </div>

        <div className="space-y-3 text-[14px] text-[#4a5565] leading-6">
          <p>
            This is relevant to users because many people judge sun risk by
            temperature, but UV radiation depends on solar intensity rather than
            how hot the day feels. Even cool or partly cloudy days can still
            expose users to harmful UV levels.
          </p>
          <p>
            Showing historical UV patterns helps users understand that sun
            safety should be a regular habit, not something used only on
            obviously hot days. It supports better decisions about sunscreen,
            shade, hats, sunglasses, and outdoor timing throughout the year.
          </p>
        </div>

        {showHistChart && (
          <div className="mt-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[#717182] text-[14px]">
                  {histView === "monthly"
                    ? `Daily maximum UV index averaged by month — ${years.join(", ") || "loading..."}`
                    : "Annual average, minimum, and maximum daily UV index"}
                </p>
              </div>

              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                {(["monthly", "yearly"] as HistView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setHistView(v)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                      histView === v
                        ? "bg-white text-[#101828] shadow-sm border border-black/5"
                        : "text-[#6B7280] hover:text-[#101828]"
                    }`}
                  >
                    {v === "monthly" ? "Monthly" : "Yearly Avg"}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px] w-full min-w-0 min-h-0 mt-4">
              {histLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[#717182] text-[13px]">
                    Loading UV history from database...
                  </p>
                </div>
              ) : histError ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <p className="text-red-500 text-[13px]">
                    Could not load UV history.
                  </p>
                  <p className="text-[#717182] text-[12px]">{histError}</p>
                </div>
              ) : !histData ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[#717182] text-[13px]">
                    No data available.
                  </p>
                </div>
              ) : histData.view === "monthly" ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <LineChart
                    data={histData.data}
                    margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 16]}
                      tickCount={9}
                    />
                    <ReferenceLine
                      y={3}
                      stroke="#F0B100"
                      strokeDasharray="4 3"
                      label={{
                        value: "Mod",
                        position: "insideTopRight",
                        fontSize: 9,
                        fill: "#b45309",
                      }}
                    />
                    <ReferenceLine
                      y={6}
                      stroke="#FF6900"
                      strokeDasharray="4 3"
                      label={{
                        value: "High",
                        position: "insideTopRight",
                        fontSize: 9,
                        fill: "#FF6900",
                      }}
                    />
                    <ReferenceLine
                      y={8}
                      stroke="#FB2C36"
                      strokeDasharray="4 3"
                      label={{
                        value: "V.High",
                        position: "insideTopRight",
                        fontSize: 9,
                        fill: "#FB2C36",
                      }}
                    />
                    <ReferenceLine
                      y={11}
                      stroke="#9810FA"
                      strokeDasharray="4 3"
                      label={{
                        value: "Extreme",
                        position: "insideTopRight",
                        fontSize: 9,
                        fill: "#9810FA",
                      }}
                    />
                    <Tooltip content={<HistTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => (
                        <span style={{ fontSize: 12, color: "#4a5565" }}>
                          {v}
                        </span>
                      )}
                    />
                    {years.map((yr) => (
                      <Line
                        key={yr}
                        type="monotone"
                        dataKey={yr}
                        stroke={YEAR_PALETTE[yr] || "#aaa"}
                        strokeWidth={2}
                        dot={{
                          fill: YEAR_PALETTE[yr] || "#aaa",
                          r: 2.5,
                          strokeWidth: 0,
                        }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        name={yr}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <LineChart
                    data={(histData as YearlyResp).data}
                    margin={{ top: 4, right: 8, bottom: 0, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={{ stroke: "#E5E7EB" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 16]}
                      tickCount={9}
                    />
                    <ReferenceLine
                      y={6}
                      stroke="#FF6900"
                      strokeDasharray="4 3"
                      label={{
                        value: "High",
                        position: "insideTopRight",
                        fontSize: 9,
                        fill: "#FF6900",
                      }}
                    />
                    <Tooltip content={<HistTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => (
                        <span style={{ fontSize: 12, color: "#4a5565" }}>
                          {v}
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxUv"
                      stroke="#FB2C36"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#FB2C36", strokeWidth: 0 }}
                      name="Daily Max (avg peak)"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="avgUv"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#F59E0B", strokeWidth: 0 }}
                      name="Annual Avg"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="minUv"
                      stroke="#00C950"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#00C950", strokeWidth: 0 }}
                      name="Daily Min (avg low)"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {histData && !histLoading && histData.view === "monthly" && (
              <div className="mt-4 pt-4 border-t border-black/5 flex flex-wrap gap-x-6 gap-y-2">
                {years.map((yr) => {
                  const rows = (histData as MonthlyResp).data;
                  const valid = rows.filter(
                    (r) => r[yr] !== undefined && r[yr] !== null,
                  );
                  const peak = valid.reduce(
                    (a, b) => (b[yr] > a[yr] ? b : a),
                    valid[0],
                  );
                  return (
                    <div
                      key={yr}
                      className="flex items-center gap-1.5 text-[12px]"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: YEAR_PALETTE[yr] }}
                      />
                      <span className="text-[#6a7282]">{yr} peak:</span>
                      <span className="font-semibold text-[#101828]">
                        {peak?.[yr] ?? "–"} in {peak?.month ?? "–"}
                      </span>
                    </div>
                  );
                })}
                <span className="ml-auto text-[11px] text-[#9ca3af]">
                  Source: SunGuard daily_max_uv database
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skin Cancer Incidence Trends — from melanoma_cases DB */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#F54900] text-[18px]">📈</span>
              <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
                Skin Cancer Incidence Trends in Australia
              </h3>
            </div>
            <p className="text-[#717182] text-[14px] mt-1">
              Skin cancer is one of the most common cancers in Australia, so sun protection is directly relevant
              to everyday health decisions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCancerChart((prev) => !prev)}
            className="shrink-0 px-3 py-2 text-[13px] font-medium rounded-lg border border-black/10 text-[#4a5565] hover:text-[#FF6900] hover:border-[#FF6900] hover:bg-orange-50 transition-colors cursor-pointer"
          >
            {showCancerChart ? "Hide chart" : "See chart"}
          </button>
        </div>

        <div className="space-y-3 text-[14px] text-[#4a5565] leading-6">
          <p>
            This matters to users because UV damage builds up over time. Habits such as skipping sunscreen,
            staying outdoors during peak UV hours, or underestimating cloudy-day exposure can contribute to
            long-term skin damage and increase cancer risk.
          </p>
          <p>
            Showing Australian melanoma trends helps connect personal behaviour with a larger public health issue.
            It reinforces that sun safety is not only about avoiding sunburn in the moment, but also about reducing
            long-term health risks through prevention.
          </p>
        </div>

        {showCancerChart && (
          <div className="mt-6">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[#717182] text-[14px]">
                Annual melanoma incidence (all persons, Australia) — {firstYear}–{lastYear}
              </p>

              <span className={`text-[11px] px-2 py-1 rounded-lg border ${cancerSource === "db"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-black/5 text-[#6a7282]"
                }`}>
                {cancerSource === "db" ? "Live database" : "Built-in data"}
              </span>
            </div>

            {cancerLoading ? (
              <div className="h-[280px] flex flex-col items-center justify-center gap-2 mt-4">
                <div className="w-8 h-8 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#717182] text-[13px]">Loading from database...</p>
              </div>
            ) : (
              <div className="h-[280px] w-full min-w-0 min-h-0 mt-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={cancerData} margin={{ top: 4, right: 8, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={{ stroke: "#6B7280" }}
                      tickLine={{ stroke: "#6B7280" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6B7280" }}
                      axisLine={{ stroke: "#6B7280" }}
                      tickLine={{ stroke: "#6B7280" }}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                      label={{ value: "Cases", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#808080" } }}
                    />
                    <Tooltip content={<CancerTooltip />} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 12, color: "#4a5565" }}>{v}</span>} />
                    <Line
                      type="monotone"
                      dataKey="cases"
                      stroke="#EF4444"
                      strokeWidth={2.5}
                      dot={{ fill: "#EF4444", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#EF4444", strokeWidth: 0 }}
                      name="Melanoma Cases"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-black/5 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[#101828] text-[20px]" style={{ fontWeight: 700 }}>
                  {firstCount.toLocaleString()}
                </p>
                <p className="text-[#6B7280] text-[12px]">{firstYear} cases</p>
              </div>
              <div className="text-center">
                <p className="text-[#EF4444] text-[20px]" style={{ fontWeight: 700 }}>
                  +{growthPct}%
                </p>
                <p className="text-[#6B7280] text-[12px]">growth over period</p>
              </div>
              <div className="text-center">
                <p className="text-[#101828] text-[20px]" style={{ fontWeight: 700 }}>
                  {lastCount.toLocaleString()}
                </p>
                <p className="text-[#6B7280] text-[12px]">{lastYear} cases</p>
              </div>
            </div>

            <p className="text-[11px] text-[#9ca3af] mt-2 text-right">Source: AIHW melanoma_cases database</p>
          </div>
        )}
      </div>

      {/* Insight Box */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-5 py-4 flex items-start gap-3">
        <Info size={18} className="text-[#1d4ed8] mt-0.5 shrink-0" />
        <div>
          <p className="text-[#1e3a5f] text-[14px]" style={{ fontWeight: 500 }}>
            Important Insight
          </p>
          <p className="text-[#1e40af] text-[14px]">
            Melanoma incidence grew by {growthPct}% between {firstYear} and{" "}
            {lastYear}. Early detection and prevention through sun protection
            are crucial.
          </p>
        </div>
      </div>

     {/* Sun Protection Behaviours */}
<div className="bg-white rounded-2xl border border-black/10 p-6">
  <div className="flex items-start justify-between gap-4 mb-4">
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[18px]">👥</span>
        <h3
          className="text-[#0a0a0a] text-[16px]"
          style={{ fontWeight: 500 }}
        >
          Sun Protection Behaviors
        </h3>
      </div>
      <p className="text-[#717182] text-[14px] mt-1">
        Common protective practices in Australia
      </p>
    </div>

    <button
      type="button"
      onClick={() => setShowBehaviourChart((prev) => !prev)}
      className="shrink-0 px-3 py-2 text-[13px] font-medium rounded-lg border border-black/10 text-[#4a5565] hover:text-[#FF6900] hover:border-[#FF6900] hover:bg-orange-50 transition-colors cursor-pointer"
    >
      {showBehaviourChart ? "Hide chart" : "See chart"}
    </button>
  </div>

  <div className="space-y-3 text-[14px] text-[#4a5565] leading-6">
    <p>
      This is relevant to users because sun protection is not just about using
      one product. People reduce UV risk more effectively when they combine
      behaviours such as sunscreen, shade, hats, sunglasses, and avoiding peak
      UV times.
    </p>
    <p>
      Showing these behaviour patterns helps users recognise which protective
      habits are already common and which ones are often overlooked. It
      encourages more complete sun safety routines in everyday life.
    </p>
  </div>

  {showBehaviourChart && (
    <div className="mt-6">
      <p className="text-[#717182] text-[14px] mb-4">
        Percentage of Australians using different sun protection behaviours. Note: Percentages represent independent behaviours and do not sum to 100%, as individuals may adopt multiple protection methods.
      </p>

      <div className="h-[360px] w-full min-w-0 min-h-0 mt-2">
  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
    <PieChart>
      <Pie
        data={behaviourData}
        dataKey="percentage"
        nameKey="behaviour"
        cx="50%"
        cy="50%"
        outerRadius={110}
        label={({ behaviour, percentage }) => `${behaviour}: ${percentage}%`}
      >
        {behaviourData.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={BEHAVIOUR_COLORS[index % BEHAVIOUR_COLORS.length]}
          />
        ))}
      </Pie>

      <Tooltip
        contentStyle={{
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 13,
        }}
        formatter={(value: number) => [`${value}%`, "Percentage"]}
      />

      <Legend
        iconType="circle"
        iconSize={8}
        formatter={(value) => (
          <span style={{ fontSize: 12, color: "#4a5565" }}>{value}</span>
        )}
      />
    </PieChart>
  </ResponsiveContainer>
</div>

      <div className="bg-[#fef3c7] rounded-xl px-5 py-3 mt-4">
        <p className="text-[#92400e] text-[13px]">
          <span style={{ fontWeight: 600 }}>Key Finding:</span> Key Finding: While protective behaviours such as sunscreen (67%) and sunglasses (72%) 
          are widely adopted, only 34% of people avoid peak UV hours — 
          one of the most effective ways to reduce UV exposure. This suggests a gap in awareness around behavioural protection strategies.
        </p>
      </div>
    </div>
  )}
</div>
      {/* Myths Section */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
          Common Myths About Sun Safety
        </h3>
        <p className="text-[#717182] text-[14px] mt-1 mb-6">
          Fact-checking popular misconceptions
        </p>
        <div className="flex flex-col gap-4">
          {myths.map((item) => (
            <div
              key={item.myth}
              className="bg-[#fafafa] rounded-xl p-5 flex items-start gap-4"
            >
              <span className="text-[24px] shrink-0">{item.emoji}</span>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-[#EF4444] shrink-0" />
                  <p
                    className="text-[#0a0a0a] text-[14px]"
                    style={{ fontWeight: 500 }}
                  >
                    Myth: {item.myth}
                  </p>
                </div>
                <p className="text-[#4a5565] text-[14px]">
                  <span className="text-[#EF4444]" style={{ fontWeight: 600 }}>
                    Truth:{" "}
                  </span>
                  {item.truth}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Did You Know */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3
          className="text-[#0a0a0a] text-[16px] mb-4"
          style={{ fontWeight: 500 }}
        >
          Did You Know?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facts.map((fact) => (
            <div key={fact.title} className={`${fact.bg} rounded-xl p-5`}>
              <p className="text-[14px] mb-2" style={{ fontWeight: 600 }}>
                {fact.emoji} {fact.title}
              </p>
              <p className="text-[13px] text-[#4a5565]">{fact.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
