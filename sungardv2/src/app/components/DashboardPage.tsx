import { AlertTriangle, Shield, Clock, TrendingUp, Sun, MapPin, RefreshCw, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useAppContext } from "./Layout";
import { UVMap } from "./UVMap";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const uvScale = [
  { label: "Low (0-2)", color: "#00C950" },
  { label: "Moderate (3-5)", color: "#F0B100" },
  { label: "High (6-7)", color: "#FF6900" },
  { label: "Very High (8-10)", color: "#FB2C36" },
  { label: "Extreme (11+)", color: "#9810FA" },
];

function getUVRange(uv: number) {
  if (uv <= 2) return "0-2";
  if (uv <= 5) return "3-5";
  if (uv <= 7) return "6-7";
  if (uv <= 10) return "8-10";
  return "11+";
}

function getForecastGradientColor(maxUV: number): string {
  if (maxUV <= 2) return "#00C950";
  if (maxUV <= 5) return "#F0B100";
  if (maxUV <= 7) return "#FF6900";
  if (maxUV <= 10) return "#FB2C36";
  return "#9810FA";
}

type SunscreenRecommendation = { riskLevel: string; spfLevel: string; advice: string };

function getFallbackRecommendation(uv: number): SunscreenRecommendation {
  if (uv <= 2) return { riskLevel: "Low", spfLevel: "SPF 15+", advice: "Minimal protection needed. SPF 15 is sufficient for most people during low UV periods." };
  if (uv <= 5) return { riskLevel: "Moderate", spfLevel: "SPF 30+", advice: "Apply SPF 30+ sunscreen. Wear a hat and sunglasses when outdoors for extended periods." };
  if (uv <= 7) return { riskLevel: "High", spfLevel: "SPF 50+", advice: "SPF 50+ is strongly recommended. Seek shade during peak hours and reapply every 2 hours." };
  if (uv <= 10) return { riskLevel: "Very High", spfLevel: "SPF 50+", advice: "Maximum protection required. Minimize outdoor exposure, wear protective clothing, and reapply SPF 50+ every 2 hours." };
  return { riskLevel: "Extreme", spfLevel: "SPF 50+", advice: "Extreme UV levels. Avoid outdoor exposure where possible. Full protective clothing and SPF 50+ are essential." };
}

function formatFetchTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function DashboardPage() {
  const { uvData, setUVDataOverrides } = useAppContext();
  const { currentUV, riskLevel, riskColor, peakHours, hourlyForecast, locationName, uvLoading, uvFromCache, uvCacheAgeMinutes } = uvData;

  const [sunscreenRec, setSunscreenRec] = useState<SunscreenRecommendation | null>(null);
  const [recSource, setRecSource] = useState<"backend" | "fallback" | "loading">("loading");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  useEffect(() => { if (!uvLoading) setFetchedAt(new Date()); }, [uvLoading, currentUV]);

  useEffect(() => {
    async function fetchRecommendation() {
      if (!backendUrl) { setSunscreenRec(getFallbackRecommendation(currentUV)); setRecSource("fallback"); return; }
      try {
        const response = await fetch(`${backendUrl}/uv/recommendation?uvLevel=${currentUV}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        setSunscreenRec(await response.json());
        setRecSource("backend");
      } catch { setSunscreenRec(getFallbackRecommendation(currentUV)); setRecSource("fallback"); }
    }
    fetchRecommendation();
  }, [currentUV]);

  const savedLocation = localStorage.getItem("sunguard_location") || undefined;

  const maxForecastUV = hourlyForecast.length > 0
    ? Math.max(...hourlyForecast.map((h) => h.uv), currentUV)
    : currentUV;
  const yAxisMax = Math.max(4, Math.ceil(maxForecastUV * 1.2));
  const forecastColor = getForecastGradientColor(maxForecastUV);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const uv = payload[0].value;
    const risk = uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : uv <= 7 ? "High" : uv <= 10 ? "Very High" : "Extreme";
    const color = uv <= 2 ? "#00C950" : uv <= 5 ? "#F0B100" : uv <= 7 ? "#FF6900" : uv <= 10 ? "#FB2C36" : "#9810FA";
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-[13px]">
        <p className="text-[#6B7280] mb-1">{label}</p>
        <p className="font-bold text-[#101828]">UV Index: <span style={{ color }}>{uv}</span></p>
        <p className="text-[#6B7280]">{risk}</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {currentUV >= 6 && !uvLoading && (
        <div className="bg-[#fff7ed] border border-[#ff6900] rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#0a0a0a] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#7e2a0c] text-[14px]" style={{ fontWeight: 500 }}>High UV Alert</p>
            <p className="text-[#9f2d00] text-[14px]">UV levels are currently high ({currentUV}) in {locationName}. Apply SPF 50+ and seek shade during peak hours.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-6">
        {/* Current UV Index card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>Current UV Index</h3>
              <p className="text-[#717182] text-[14px] mt-0.5">Real-time UV radiation level</p>
            </div>
            {!uvLoading && (
              <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${
                uvFromCache ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700"
              }`}>
                {uvFromCache ? <Zap size={11} /> : <RefreshCw size={11} />}
                {uvFromCache ? `Cached ${uvCacheAgeMinutes === 0 ? "just now" : `${uvCacheAgeMinutes}min ago`}` : "Live"}
              </span>
            )}
          </div>

          {/* Location + fetched time */}
          <div className="flex items-center gap-4 mt-3 pb-4 border-b border-black/5">
            <div className="flex items-center gap-1.5 text-[13px] text-[#4a5565]">
              <MapPin size={13} className="text-[#F54900] shrink-0" />
              <span className="font-medium">{uvLoading ? "Detecting location..." : locationName}</span>
            </div>
            {fetchedAt && !uvLoading && (
              <div className="flex items-center gap-1.5 text-[12px] text-[#9ca3af] ml-auto">
                <Clock size={12} />
                <span>Fetched {formatFetchTime(fetchedAt)}</span>
              </div>
            )}
          </div>

          {uvLoading ? (
            <div className="flex items-center justify-center h-[100px]">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#717182] text-[13px]">Fetching live UV data...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between mt-5">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-[#101828] text-[60px]" style={{ fontWeight: 700, lineHeight: 1 }}>{currentUV}</span>
                  <div className="mb-2">
                    <span className="bg-[var(--badge-color)] text-white text-[12px] px-2 py-0.5 rounded-lg"
                      style={{ fontWeight: 500, "--badge-color": riskColor } as CSSProperties}>{riskLevel}</span>
                    <p className="text-[#4a5565] text-[14px] mt-1">{getUVRange(currentUV)}</p>
                  </div>
                </div>
                <p className="text-[#4a5565] text-[14px] mt-3">
                  {currentUV === 0 ? "UV index is 0 — no sun protection needed right now." : "Protection required. Seek shade during midday hours."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[#364153] text-[12px]" style={{ fontWeight: 600 }}>UV Risk Scale</p>
                {uvScale.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-[#4a5565] text-[12px]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk Level */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#155dfc]" />
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>Risk Level</h3>
          </div>
          <div className="mt-6">
            {uvLoading ? <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" /> :
              <p className="text-[#101828] text-[30px]" style={{ fontWeight: 700 }}>{riskLevel}</p>}
            <p className="text-[#4a5565] text-[14px] mt-1">Current exposure risk</p>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#9810fa]" />
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>Peak Hours</h3>
          </div>
          <div className="mt-6">
            {uvLoading ? <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" /> :
              <p className="text-[#101828] text-[24px]" style={{ fontWeight: 700 }}>{peakHours}</p>}
            <p className="text-[#4a5565] text-[14px] mt-1">Seek shade during this time</p>
          </div>
        </div>
      </div>

      {/* 12-Hour UV Forecast */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#F54900]" />
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>12-Hour UV Forecast</h3>
          </div>
          {!uvLoading && locationName && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <MapPin size={12} className="text-[#F54900]" />
              <span>{locationName}</span>
            </div>
          )}
        </div>
        <p className="text-[#717182] text-[14px] mb-6">Plan your outdoor activities safely</p>

        {uvLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#717182] text-[13px]">Loading forecast...</p>
            </div>
          </div>
        ) : hourlyForecast.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-[#717182] text-[14px]">No forecast data available.</p>
          </div>
        ) : (
          <div className="h-[300px] w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={hourlyForecast}>
                <defs>
                  <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={forecastColor} stopOpacity={0.75} />
                    <stop offset="95%" stopColor={forecastColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={{ stroke: "#6B7280" }} tickLine={{ stroke: "#6B7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={{ stroke: "#6B7280" }} tickLine={{ stroke: "#6B7280" }}
                  label={{ value: "UV Index", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "#808080" } }}
                  domain={[0, yAxisMax]} allowDecimals={false} />
                <ReferenceLine y={3} stroke="#F0B100" strokeDasharray="4 4" label={{ value: "Mod", position: "insideTopRight", fontSize: 10, fill: "#F0B100" }} />
                <ReferenceLine y={6} stroke="#FF6900" strokeDasharray="4 4" label={{ value: "High", position: "insideTopRight", fontSize: 10, fill: "#FF6900" }} />
                <ReferenceLine y={8} stroke="#FB2C36" strokeDasharray="4 4" label={{ value: "V.High", position: "insideTopRight", fontSize: 10, fill: "#FB2C36" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="uv" stroke={forecastColor} strokeWidth={2.5} fill="url(#uvGradient)" name="UV Index"
                  dot={{ fill: forecastColor, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: forecastColor, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={18} className="text-[#F54900]" />
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>Interactive UV Map</h3>
        </div>
        <p className="text-[#717182] text-[14px] mb-6">Pinpoint a location to get local UV details</p>
        <div className="h-[400px]">
          <UVMap
            currentUv={currentUV}
            onLocationSelect={(payload) => setUVDataOverrides(payload)}
            initialLocation={savedLocation}
          />
        </div>
      </div>

      {/* Sunscreen Recommendation */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>Sunscreen Recommendation</h3>
            <p className="text-[#717182] text-[14px] mt-1">Based on current UV index</p>
          </div>
          {recSource === "fallback" && (
            <span className="text-[11px] text-[#6a7282] bg-gray-100 px-2 py-1 rounded-lg border border-black/5">Built-in data</span>
          )}
        </div>
        <div className="mt-4 bg-[#fff7ed] rounded-xl px-5 py-4 flex items-start gap-3">
          <Sun size={20} className="text-[#F54900] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#101828] text-[14px]" style={{ fontWeight: 600 }}>
              {sunscreenRec ? `${sunscreenRec.spfLevel} strongly recommended for ${riskLevel.toLowerCase()} UV levels.` : "Loading recommendation..."}
            </p>
            <p className="text-[#4a5565] text-[14px] mt-1">
              {sunscreenRec ? sunscreenRec.advice : "Calculating advice based on current UV index..."}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
