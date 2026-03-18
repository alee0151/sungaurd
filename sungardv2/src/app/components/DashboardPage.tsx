import {
  AlertTriangle, Shield, Clock, TrendingUp, Sun, MapPin, RefreshCw,
  Zap, LocateFixed, Search, X, Eye, Shirt, Umbrella, Activity,
  Info, ChevronDown, ChevronUp, Lightbulb,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { useAppContext } from "./Layout";
import { UVMap } from "./UVMap";
import { useEffect, useState, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import {
  readUVCache, writeUVCache, cacheAgeMinutes, type UVCacheEntry,
} from "../utils/uvCache";

// ─── Constants & helpers ─────────────────────────────────────────────────────

const uvScale = [
  { label: "Low (0-2)",        color: "#00C950" },
  { label: "Moderate (3-5)",   color: "#F0B100" },
  { label: "High (6-7)",       color: "#FF6900" },
  { label: "Very High (8-10)", color: "#FB2C36" },
  { label: "Extreme (11+)",    color: "#9810FA" },
];

function getUVRange(uv: number) {
  if (uv <= 2) return "0-2"; if (uv <= 5) return "3-5";
  if (uv <= 7) return "6-7"; if (uv <= 10) return "8-10"; return "11+";
}
function getForecastGradientColor(maxUV: number): string {
  if (maxUV <= 2) return "#00C950"; if (maxUV <= 5) return "#F0B100";
  if (maxUV <= 7) return "#FF6900"; if (maxUV <= 10) return "#FB2C36"; return "#9810FA";
}
function getRiskDescription(uv: number): string {
  if (uv <= 2) return "Safe to be outside — no protection needed.";
  if (uv <= 5) return "Some risk — apply SPF 50+ before heading out.";
  if (uv <= 7) return "High risk — sunscreen, hat & shade are essential.";
  if (uv <= 10) return "Very high risk — limit time outdoors, cover up.";
  return "Extreme risk — avoid the sun where possible.";
}
function getPeakHoursDescription(peakHours: string): string {
  if (peakHours === "No peak hours today") return "UV stays low all day — no high-risk window today.";
  return "UV \u2265 6 during this window — stay in the shade and reapply SPF.";
}

type SunscreenRecommendation = { riskLevel: string; spfLevel: string; advice: string };
function getFallbackRecommendation(uv: number): SunscreenRecommendation {
  if (uv <= 2)  return { riskLevel: "Low",       spfLevel: "No sunscreen required", advice: "UV index is low — sun protection is generally not needed. Enjoy time outdoors, though a hat is still a good habit." };
  if (uv <= 5)  return { riskLevel: "Moderate",  spfLevel: "SPF 50+", advice: "Apply SPF 50+ sunscreen 20 minutes before going outside and reapply every 2 hours. Wear a broad-brimmed hat and UV-protective sunglasses." };
  if (uv <= 7)  return { riskLevel: "High",      spfLevel: "SPF 50+", advice: "SPF 50+ is essential. Apply generously 20 minutes before sun exposure and reapply every 2 hours or after swimming/sweating. Seek shade during peak hours." };
  if (uv <= 10) return { riskLevel: "Very High", spfLevel: "SPF 50+", advice: "Maximum protection required. Apply SPF 50+ liberally, wear long sleeves, a broad-brimmed hat, and UV-wrap sunglasses. Minimise time outdoors between 10 am and 3 pm." };
  return         { riskLevel: "Extreme",  spfLevel: "SPF 50+", advice: "Extreme UV — avoid outdoor exposure where possible. If you must go outside, apply SPF 50+ to all exposed skin, wear full-coverage clothing, a broad-brimmed hat, and UV-wrap sunglasses." };
}
function formatFetchTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─── UV health effects per level ─────────────────────────────────────────────
function getHealthEffects(uv: number) {
  return [
    { icon: "skin",   label: "Skin",   effect: uv <= 2 ? "No sunburn risk" : uv <= 5 ? "Sunburn possible within ~1 hr (Type I skin)" : uv <= 7 ? "Sunburn in as little as 25 min" : uv <= 10 ? "Sunburn in under 20 min" : "Sunburn in under 10 min" },
    { icon: "eye",    label: "Eyes",   effect: uv <= 2 ? "Minimal eye risk" : uv <= 5 ? "UV-protective sunglasses advised" : "UV sunglasses essential — photokeratitis risk" },
    { icon: "dna",    label: "DNA",    effect: uv <= 2 ? "Low DNA damage risk" : uv <= 5 ? "DNA damage begins — cumulative over lifetime" : "Active DNA damage — increases skin cancer risk" },
    { icon: "immune", label: "Immune", effect: uv <= 2 ? "No immunosuppression" : "Prolonged exposure can suppress local immune response" },
  ];
}

// ─── Protection checklist per UV level ───────────────────────────────────────
function getProtectionChecklist(uv: number) {
  return [
    { done: uv >= 3,  label: "SPF 50+ sunscreen (apply 20 min before going out)" },
    { done: uv >= 3,  label: "Reapply every 2 hours or after swimming/sweating" },
    { done: uv >= 3,  label: "Broad-brimmed hat (covers face, neck, ears)" },
    { done: uv >= 3,  label: "UV-protective wrap-around sunglasses" },
    { done: uv >= 6,  label: "Seek shade between 10 am – 3 pm" },
    { done: uv >= 6,  label: "Sun-protective (UPF 50+) clothing" },
    { done: uv >= 8,  label: "Long sleeves & pants" },
    { done: uv >= 11, label: "Avoid outdoor exposure entirely if possible" },
  ];
}

// ─── Did-you-know facts ───────────────────────────────────────────────────────
const UV_FACTS = [
  "2 in 3 Australians will be diagnosed with skin cancer by age 70 — one of the world's highest rates. (ARPANSA)",
  "UV radiation is present even on cloudy days — clouds block only 10–20% of UV. (WHO)",
  "Sand reflects up to 15% of UV, snow up to 80%, and water up to 10%. (WHO)",
  "UV increases ~10–12% for every 1,000 m gain in altitude. (WHO)",
  "UVA rays penetrate glass — window-side exposure still causes skin ageing. (Skin Cancer Foundation)",
  "Sunscreen degrades in UV light — SPF 50 applied at 8 am offers minimal protection by 10 am without reapplication. (Cancer Council AU)",
  "You need ~35 mL (7 teaspoons) to cover your whole body correctly. (Australian Prescriber)",
  "The teaspoon rule: 1 tsp per arm, per leg, front torso, back torso, and face/neck. (Cancer Council AU)",
  "UV damage is cumulative and irreversible — even one bad sunburn in childhood increases lifetime cancer risk. (Skin Cancer Foundation)",
  "Tanning beds use UVA — they still increase melanoma risk despite not causing immediate redness. (ABC Science)",
];

const OW_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const backendUrl = import.meta.env.VITE_BACKEND_URL;

async function fetchFullUV(lat: number, lon: number): Promise<{ uv: number; hourlyForecast: { time: string; uv: number }[] }> {
  if (!OW_API_KEY) return { uv: 0, hourlyForecast: [] };
  const res = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&appid=${OW_API_KEY}&units=metric`);
  if (!res.ok) throw new Error(`OW API ${res.status}`);
  const data = await res.json();
  const uv = Math.round((data.current?.uvi ?? 0) * 10) / 10;
  const currentHour = new Date().getHours();
  const hourlyForecast = (data.hourly as any[]).slice(0, 12).map((h: any, i: number) => ({
    time: `${String((currentHour + i) % 24).padStart(2, "0")}:00`,
    uv: Math.round((h.uvi ?? 0) * 10) / 10,
  }));
  return { uv, hourlyForecast };
}
async function reverseGeocodeLocation(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data?.address) {
      const a = data.address;
      return [a.suburb || a.neighbourhood || a.residential, a.city || a.town || a.village || a.county, a.state || a.region].filter(Boolean).join(", ") || "Your Location";
    }
  } catch { /* ignore */ }
  return "Your Location";
}
async function geocodeSearch(query: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name.split(",").slice(0, 3).join(",") };
  } catch { /* ignore */ }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { uvData, setUVDataOverrides } = useAppContext();
  const { currentUV, riskLevel, riskColor, peakHours, hourlyForecast, locationName, uvLoading, uvFromCache, uvCacheAgeMinutes } = uvData;

  const [sunscreenRec, setSunscreenRec] = useState<SunscreenRecommendation | null>(null);
  const [recSource, setRecSource]       = useState<"backend" | "fallback" | "loading">("loading");
  const [fetchedAt, setFetchedAt]       = useState<Date | null>(null);
  const [locating, setLocating]         = useState(false);
  const [locError, setLocError]         = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [searching, setSearching]       = useState(false);
  const [searchError, setSearchError]   = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [showChecklist, setShowChecklist] = useState(true);
  const [factIndex, setFactIndex]         = useState(() => Math.floor(Math.random() * UV_FACTS.length));

  useEffect(() => { if (!uvLoading) setFetchedAt(new Date()); }, [uvLoading, currentUV]);

  useEffect(() => {
    async function fetchRecommendation() {
      if (!backendUrl) { setSunscreenRec(getFallbackRecommendation(currentUV)); setRecSource("fallback"); return; }
      try {
        const r = await fetch(`${backendUrl}/uv/recommendation?uvLevel=${currentUV}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setSunscreenRec(await r.json()); setRecSource("backend");
      } catch { setSunscreenRec(getFallbackRecommendation(currentUV)); setRecSource("fallback"); }
    }
    fetchRecommendation();
  }, [currentUV]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocError("Geolocation is not supported by your browser."); return; }
    setLocating(true); setLocError(null); setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const cached = readUVCache(lat, lon);
          if (cached && cached.hourlyForecast.length > 0) {
            const ageMin = cacheAgeMinutes(cached);
            setUVDataOverrides({ uv: cached.uv, locationName: cached.locationName, hourlyForecast: cached.hourlyForecast, fromCache: true, cacheAgeMinutes: ageMin });
            setFetchedAt(new Date()); setLocating(false); return;
          }
          const [uvResult, locName] = await Promise.all([fetchFullUV(lat, lon), reverseGeocodeLocation(lat, lon)]);
          const entry: UVCacheEntry = { uv: uvResult.uv, hourlyForecast: uvResult.hourlyForecast, locationName: locName, lat, lon, fetchedAt: Date.now() };
          writeUVCache(entry);
          setUVDataOverrides({ uv: uvResult.uv, locationName: locName, hourlyForecast: uvResult.hourlyForecast, fromCache: false, cacheAgeMinutes: 0 });
          setFetchedAt(new Date());
        } catch (err) { console.error("[DashboardPage] location fetch error", err); setLocError("Failed to fetch UV for your location. Please try again."); }
        finally { setLocating(false); }
      },
      (err) => { console.error("[DashboardPage] geolocation error", err); setLocError("Location access denied. Please enable location permissions."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setUVDataOverrides]);

  const handleSearchLocation = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim(); if (!q) return;
    setSearching(true); setSearchError(null); setLocError(null);
    try {
      const result = await geocodeSearch(q);
      if (!result) { setSearchError(`No results found for "${q}". Try a city or suburb name.`); setSearching(false); return; }
      const { lat, lon, displayName } = result;
      const cached = readUVCache(lat, lon);
      if (cached && cached.hourlyForecast.length > 0) {
        const ageMin = cacheAgeMinutes(cached);
        setUVDataOverrides({ uv: cached.uv, locationName: displayName, hourlyForecast: cached.hourlyForecast, fromCache: true, cacheAgeMinutes: ageMin });
        setFetchedAt(new Date()); setSearchQuery(""); setSearching(false); return;
      }
      const uvResult = await fetchFullUV(lat, lon);
      const entry: UVCacheEntry = { uv: uvResult.uv, hourlyForecast: uvResult.hourlyForecast, locationName: displayName, lat, lon, fetchedAt: Date.now() };
      writeUVCache(entry);
      setUVDataOverrides({ uv: uvResult.uv, locationName: displayName, hourlyForecast: uvResult.hourlyForecast, fromCache: false, cacheAgeMinutes: 0 });
      setFetchedAt(new Date()); setSearchQuery("");
    } catch (err) { console.error("[DashboardPage] search error", err); setSearchError("Failed to fetch UV for that location. Please try again."); }
    finally { setSearching(false); }
  }, [searchQuery, setUVDataOverrides]);

  const savedLocation = localStorage.getItem("sunguard_location") || undefined;
  const maxForecastUV = hourlyForecast.length > 0 ? Math.max(...hourlyForecast.map(h => h.uv), currentUV) : currentUV;
  const yAxisMax      = Math.max(4, Math.ceil(maxForecastUV * 1.2));
  const forecastColor = getForecastGradientColor(maxForecastUV);

  const healthEffects   = getHealthEffects(currentUV);
  const checklist       = getProtectionChecklist(currentUV);
  const activeChecklist = checklist.filter(c => c.done);

  const recCardStyle =
    currentUV <= 2  ? { bg: "bg-[#f0fdf4]", border: "border-[#bbf7d0]", iconColor: "text-[#00C950]" } :
    currentUV <= 5  ? { bg: "bg-[#fefce8]", border: "border-[#fde68a]", iconColor: "text-[#F0B100]" } :
    currentUV <= 7  ? { bg: "bg-[#fff7ed]", border: "border-[#ff6900]", iconColor: "text-[#FF6900]" } :
    currentUV <= 10 ? { bg: "bg-[#fff1f2]", border: "border-[#fca5a5]", iconColor: "text-[#FB2C36]" } :
                      { bg: "bg-[#faf5ff]", border: "border-[#c084fc]", iconColor: "text-[#9810FA]" };

  const riskDescColor =
    currentUV <= 2  ? "text-[#16a34a]" : currentUV <= 5 ? "text-[#ca8a04]" :
    currentUV <= 7  ? "text-[#ea580c]" : currentUV <= 10 ? "text-[#dc2626]" : "text-[#7c3aed]";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const uv = payload[0].value;
    const color = uv <= 2 ? "#00C950" : uv <= 5 ? "#F0B100" : uv <= 7 ? "#FF6900" : uv <= 10 ? "#FB2C36" : "#9810FA";
    const risk  = uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : uv <= 7 ? "High" : uv <= 10 ? "Very High" : "Extreme";
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-[13px]">
        <p className="text-[#6B7280] mb-1">{label}</p>
        <p className="font-bold text-[#101828]">UV Index: <span style={{ color }}>{uv}</span></p>
        <p className="text-[#6B7280]">{risk}</p>
        {uv >= 3 && <p className="text-[#FF6900] font-medium mt-1">SPF 50+ required</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Alerts */}
      {currentUV >= 6 && !uvLoading && (
        <div className="bg-[#fff7ed] border border-[#ff6900] rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#0a0a0a] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#7e2a0c] text-[14px] font-medium">High UV Alert</p>
            <p className="text-[#9f2d00] text-[14px]">UV is currently {currentUV} in {locationName}. Apply SPF 50+ and seek shade during peak hours.</p>
          </div>
        </div>
      )}
      {currentUV >= 3 && currentUV <= 5 && !uvLoading && (
        <div className="bg-[#fefce8] border border-[#fde68a] rounded-xl px-5 py-3 flex items-center gap-3">
          <Sun size={16} className="text-[#F0B100] shrink-0" />
          <p className="text-[#713f12] text-[13px]">UV is {currentUV} — sunscreen is required from UV 3 and above. Apply <strong>SPF 50+</strong> before heading out.</p>
        </div>
      )}

      {/* Did You Know fact strip */}
      <div className="bg-gradient-to-r from-[#fff7ed] to-[#fefce8] border border-[#fde68a] rounded-xl px-4 py-3 flex items-start gap-3">
        <Lightbulb size={16} className="text-[#F0B100] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-[#b45309] uppercase tracking-wide">Did you know?</span>
          <p className="text-[#713f12] text-[13px] mt-0.5 leading-snug">{UV_FACTS[factIndex]}</p>
        </div>
        <button
          onClick={() => setFactIndex(i => (i + 1) % UV_FACTS.length)}
          className="text-[11px] text-[#b45309] hover:text-[#FF6900] font-medium shrink-0 cursor-pointer underline-offset-2 hover:underline"
        >Next &rsaquo;</button>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-6">

        {/* Current UV card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-[#0a0a0a] text-[16px] font-medium">Current UV Index</h3>
              <p className="text-[#717182] text-[13px] mt-0.5">Real-time UV radiation level</p>
            </div>
            {!uvLoading && (
              <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border shrink-0 ${
                uvFromCache ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700"
              }`}>
                {uvFromCache ? <Zap size={11} /> : <RefreshCw size={11} />}
                {uvFromCache ? `Cached ${uvCacheAgeMinutes === 0 ? "just now" : `${uvCacheAgeMinutes}min ago`}` : "Live"}
              </span>
            )}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchLocation} className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input ref={searchInputRef} type="text" value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchError(null); }}
                placeholder="Search city or suburb..."
                className="w-full pl-8 pr-8 py-2 text-[13px] border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6900]/30 focus:border-[#FF6900] bg-gray-50 text-[#101828] placeholder-gray-400"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(""); setSearchError(null); searchInputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
            <button type="submit" disabled={searching || !searchQuery.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FF6900] hover:bg-[#E55E00] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-colors cursor-pointer shrink-0">
              {searching ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={13} />}
              {searching ? "Searching..." : "Search"}
            </button>
            <button type="button" onClick={handleUseMyLocation} disabled={locating} title="Use my GPS location"
              className="flex items-center gap-1 px-3 py-2 border border-black/10 rounded-lg text-[13px] text-[#4a5565] hover:text-[#FF6900] hover:border-[#FF6900] hover:bg-orange-50 transition-colors disabled:opacity-60 cursor-pointer shrink-0">
              <LocateFixed size={13} className={locating ? "animate-pulse text-[#FF6900]" : ""} />
              {locating ? "Locating..." : "GPS"}
            </button>
          </form>

          {(locError || searchError) && (
            <p className="mb-2 text-[12px] text-red-500 flex items-center gap-1"><AlertTriangle size={12} />{locError || searchError}</p>
          )}

          {uvLoading || locating || searching ? (
            <div className="flex items-center justify-center h-[100px]">
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#717182] text-[12px]">{locating ? "Getting your location..." : searching ? "Searching location..." : "Fetching live UV data..."}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-[#101828] text-[56px] font-bold leading-none">{currentUV}</span>
                  <div className="mb-1">
                    <span className="bg-[var(--badge-color)] text-white text-[12px] px-2 py-0.5 rounded-lg font-medium"
                      style={{ "--badge-color": riskColor } as CSSProperties}>{riskLevel}</span>
                    <p className="text-[#4a5565] text-[13px] mt-1">{getUVRange(currentUV)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin size={12} className="text-[#F54900] shrink-0" />
                  <span className="text-[#4a5565] text-[13px] font-medium">{locationName}</span>
                  {fetchedAt && (
                    <span className="text-[11px] text-[#9ca3af] ml-1 flex items-center gap-1"><Clock size={11} />{formatFetchTime(fetchedAt)}</span>
                  )}
                </div>
                <p className="text-[#4a5565] text-[13px] mt-2">
                  {currentUV <= 2 ? "UV is low — no sun protection needed right now."
                    : currentUV <= 5 ? "Sunscreen required. Apply SPF 50+ before going outside."
                    : "High UV — SPF 50+ essential. Seek shade during peak hours."}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <p className="text-[#364153] text-[11px] font-semibold">UV Scale</p>
                {uvScale.map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-[#4a5565] text-[11px]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk Level card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#155dfc]" />
            <h3 className="text-[#0a0a0a] text-[16px] font-medium">Risk Level</h3>
          </div>
          <div className="mt-5 flex-1 flex flex-col justify-between">
            {uvLoading ? <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" /> : (
              <>
                <p className={`text-[30px] font-extrabold leading-tight ${riskDescColor}`}>{riskLevel}</p>
                <p className="text-[#4a5565] text-[13px] mt-2 leading-snug">{getRiskDescription(currentUV)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    currentUV <= 2  && { label: "No SPF needed",     bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
                    currentUV >= 3 && currentUV <= 5  && { label: "SPF 50+ advised",  bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
                    currentUV >= 6 && currentUV <= 7  && { label: "SPF 50+ required", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
                    currentUV >= 8 && currentUV <= 10 && { label: "Max protection",   bg: "bg-red-50",    text: "text-red-700",   border: "border-red-200" },
                    currentUV >= 11 && { label: "Stay indoors",      bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
                  ].filter(Boolean).map((pill: any) => (
                    <span key={pill.label} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${pill.bg} ${pill.text} ${pill.border}`}>{pill.label}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Peak Hours card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#9810fa]" />
            <h3 className="text-[#0a0a0a] text-[16px] font-medium">Peak Hours</h3>
          </div>
          <div className="mt-5 flex-1 flex flex-col justify-between">
            {uvLoading ? <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" /> : (
              <>
                <p className="text-[#101828] text-[24px] font-extrabold leading-tight">{peakHours}</p>
                <p className="text-[#4a5565] text-[13px] mt-2 leading-snug">{getPeakHoursDescription(peakHours)}</p>
                <div className="mt-4">
                  {peakHours === "No peak hours today"
                    ? <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">&#10003; Safe all day</span>
                    : <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-orange-50 text-orange-700 border-orange-200">&#9888; Seek shade &amp; reapply SPF</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 12-Hour Forecast */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#F54900]" />
            <h3 className="text-[#0a0a0a] text-[16px] font-medium">12-Hour UV Forecast</h3>
          </div>
          {!uvLoading && locationName && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <MapPin size={12} className="text-[#F54900]" /><span>{locationName}</span>
            </div>
          )}
        </div>
        <p className="text-[#717182] text-[13px] mb-4">Plan your outdoor activities safely — SPF 50+ required when UV reaches 3</p>
        {uvLoading ? (
          <div className="h-[240px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#717182] text-[12px]">Loading forecast...</p>
            </div>
          </div>
        ) : hourlyForecast.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-[#717182] text-[13px]">No forecast data available.</p>
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={hourlyForecast}>
                <defs>
                  <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={forecastColor} stopOpacity={0.75} />
                    <stop offset="95%" stopColor={forecastColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#6B7280" }} tickLine={{ stroke: "#6B7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#6B7280" }} tickLine={{ stroke: "#6B7280" }}
                  label={{ value: "UV Index", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#808080" } }}
                  domain={[0, yAxisMax]} allowDecimals={false} />
                <ReferenceLine y={3} stroke="#F0B100" strokeDasharray="4 4" label={{ value: "SPF 50+ required", position: "insideTopRight", fontSize: 10, fill: "#b45309" }} />
                <ReferenceLine y={6} stroke="#FF6900" strokeDasharray="4 4" label={{ value: "High",   position: "insideTopRight", fontSize: 10, fill: "#FF6900" }} />
                <ReferenceLine y={8} stroke="#FB2C36" strokeDasharray="4 4" label={{ value: "V.High", position: "insideTopRight", fontSize: 10, fill: "#FB2C36" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="uv" stroke={forecastColor} strokeWidth={2.5}
                  fill="url(#uvGradient)" name="UV Index"
                  dot={{ fill: forecastColor, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: forecastColor, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* UV Health Effects (full width now burn time estimator removed) */}
      <div className="bg-white rounded-2xl border border-black/10 p-5 flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Info size={16} className="text-[#155dfc]" />
            <h3 className="text-[#0a0a0a] text-[15px] font-semibold">Health Effects at UV {currentUV}</h3>
          </div>
          <p className="text-[#717182] text-[12px]">What UV {currentUV} ({riskLevel}) means for your body right now</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {healthEffects.map(effect => {
            const iconEl =
              effect.icon === "skin"   ? <Sun size={14} className="text-[#FF6900]" /> :
              effect.icon === "eye"    ? <Eye size={14} className="text-[#155dfc]" /> :
              effect.icon === "dna"    ? <Zap size={14} className="text-[#9810fa]" /> :
                                         <Shield size={14} className="text-[#16a34a]" />;
            return (
              <div key={effect.icon} className="flex items-start gap-3 bg-gray-50 rounded-xl px-3 py-2.5 border border-black/5">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-black/5">{iconEl}</div>
                <div>
                  <p className="text-[12px] font-semibold text-[#101828]">{effect.label}</p>
                  <p className="text-[11px] text-[#6a7282] leading-snug mt-0.5">{effect.effect}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-[#eff6ff] border border-blue-100 rounded-xl px-3 py-2.5">
          <p className="text-[11px] text-[#1d4ed8] leading-snug">
            <span className="font-semibold">Cumulative damage:</span> UV damage builds up over your lifetime and cannot be reversed. Each exposure — even without sunburn — increases long-term skin cancer risk. (Skin Cancer Foundation)
          </p>
        </div>
      </div>

      {/* Protection Checklist + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Protection Checklist */}
        <div className="bg-white rounded-2xl border border-black/10 p-5 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Umbrella size={16} className="text-[#FF6900]" />
                <h3 className="text-[#0a0a0a] text-[15px] font-semibold">Protection Checklist</h3>
              </div>
              <button onClick={() => setShowChecklist(v => !v)}
                className="text-[#9ca3af] hover:text-[#4a5565] cursor-pointer transition-colors">
                {showChecklist ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            <p className="text-[#717182] text-[12px] mt-0.5">
              {currentUV < 3 ? "No protection needed at UV below 3" : `${activeChecklist.length} measures recommended at UV ${currentUV}`}
            </p>
          </div>
          {showChecklist && (
            <div className="flex flex-col gap-2">
              {checklist.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border ${
                  item.done ? "bg-[#f0fdf4] border-green-100" : "bg-gray-50 border-black/5 opacity-40"
                }`}>
                  <div className={`w-4 h-4 rounded-full shrink-0 mt-0.5 flex items-center justify-center ${
                    item.done ? "bg-[#16a34a]" : "bg-gray-200"
                  }`}>
                    {item.done && <span className="text-white text-[9px] font-bold">&#10003;</span>}
                  </div>
                  <p className={`text-[12px] leading-snug ${item.done ? "text-[#101828] font-medium" : "text-[#6a7282]"}`}>{item.label}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-[#fff7ed] border border-[#ffcf99] rounded-xl px-3 py-2.5 mt-auto">
            <p className="text-[11px] text-[#7e2a0c] leading-snug">
              <span className="font-semibold">&#127462;&#127482; Australia:</span> 2 in 3 Australians will develop skin cancer by age 70 — the world&apos;s highest rate. Consistent daily protection is the most effective prevention. (ARPANSA)
            </p>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="bg-white rounded-2xl border border-black/10 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={16} className="text-[#F54900]" />
            <h3 className="text-[#0a0a0a] text-[15px] font-medium">Interactive UV Map</h3>
          </div>
          <p className="text-[#717182] text-[12px] mb-3">Tap any location to get local UV details</p>
          <div className="flex-1 min-h-[300px]">
            <UVMap currentUv={currentUV} onLocationSelect={(payload) => setUVDataOverrides(payload)} initialLocation={savedLocation} />
          </div>
        </div>
      </div>

      {/* Sunscreen Recommendation */}
      <div className="bg-white rounded-2xl border border-black/10 p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-[#0a0a0a] text-[15px] font-semibold">Sunscreen Recommendation</h3>
            <p className="text-[#717182] text-[12px] mt-0.5">Based on current UV — SPF 50+ required at UV 3+ (WHO / Cancer Council AU)</p>
          </div>
          {recSource === "fallback" && (
            <span className="text-[10px] text-[#6a7282] bg-gray-100 px-2 py-0.5 rounded-lg border border-black/5 shrink-0">Built-in</span>
          )}
        </div>
        <div className={`mt-3 ${recCardStyle.bg} border ${recCardStyle.border} rounded-xl px-4 py-3 flex items-start gap-3`}>
          <Sun size={18} className={`${recCardStyle.iconColor} mt-0.5 shrink-0`} />
          <div className="flex-1">
            <p className="text-[#101828] text-[13px] font-semibold">
              {sunscreenRec
                ? currentUV <= 2 ? "No sunscreen required at UV 0-2."
                  : `${sunscreenRec.spfLevel} required — UV is ${currentUV} (${riskLevel}).`
                : "Loading recommendation..."}
            </p>
            <p className="text-[#4a5565] text-[13px] mt-1 leading-snug">
              {sunscreenRec ? sunscreenRec.advice : "Calculating advice..."}
            </p>
            {sunscreenRec && currentUV >= 3 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  "Apply SPF 50+ 20 minutes before going outside",
                  "Use 1 tsp per body area (35 mL total for full body)",
                  "Reapply every 2 hours — even on cloudy days",
                  "Reapply immediately after swimming or heavy sweating",
                  "Use broad-spectrum (UVA + UVB) SPF 50+",
                  "Protect lips with SPF 30+ lip balm",
                  currentUV >= 6 ? "Seek shade between 10 am and 3 pm" : null,
                  currentUV >= 6 ? "Wear a broad-brimmed hat (brim 7.5 cm+)" : null,
                  currentUV >= 8 ? "Wear long sleeves and sun-protective clothing" : null,
                  currentUV >= 8 ? "Minimise outdoor time during peak hours" : null,
                ].filter(Boolean).map(tip => (
                  <div key={tip} className="flex items-start gap-2 text-[12px] text-[#4a5565]">
                    <span className="text-[#FF6900] mt-0.5 shrink-0">&#10003;</span>{tip}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
