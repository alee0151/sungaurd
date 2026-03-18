import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Sun, Activity, Bell, ChevronRight, Zap, User, MapPin,
  Smile, CheckCircle, TrendingUp, Droplets, ShieldCheck,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const CACHE_KEY_PREFIX = "sunguard_uv_cache_";
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes — same as uvCache.ts

function getUVRisk(uv: number) {
  if (uv <= 2)  return { level: "Low",       color: "#00C950", bg: "#f0fdf4", border: "#bbf7d0", gradFrom: "#22c55e", gradTo: "#16a34a" };
  if (uv <= 5)  return { level: "Moderate",  color: "#F0B100", bg: "#fefce8", border: "#fde68a", gradFrom: "#facc15", gradTo: "#ca8a04" };
  if (uv <= 7)  return { level: "High",      color: "#FF6900", bg: "#fff7ed", border: "#fed7aa", gradFrom: "#FF6900", gradTo: "#f63b9a" };
  if (uv <= 10) return { level: "Very High", color: "#FB2C36", bg: "#fff1f2", border: "#fecdd3", gradFrom: "#FB2C36", gradTo: "#FF6900" };
  return               { level: "Extreme",   color: "#9810FA", bg: "#faf5ff", border: "#e9d5ff", gradFrom: "#9810FA", gradTo: "#FB2C36" };
}

// Wording matches DashboardPage exactly
function getRecommendation(uv: number): string {
  if (uv <= 2)  return "UV is low — no sun protection needed right now.";
  if (uv <= 5)  return "SPF 50+ required. Apply 20 min before heading out and reapply every 2 hours.";
  if (uv <= 7)  return "High UV — SPF 50+ essential. Seek shade between 10 am – 3 pm.";
  if (uv <= 10) return "Very high UV — apply SPF 50+ liberally, wear a broad-brimmed hat and limit time outdoors.";
  return               "Extreme UV — avoid outdoor exposure where possible. SPF 50+ and full cover essential.";
}

function getTodayAppCount(): number {
  try {
    const raw = localStorage.getItem("sunguard_logs_cache");
    if (!raw) return 0;
    const logs: { type: string; logged_at: string }[] = JSON.parse(raw);
    const todayStr = new Date().toISOString().slice(0, 10);
    return logs.filter((l) => l.type === "Application" && l.logged_at.slice(0, 10) === todayStr).length;
  } catch { return 0; }
}

function getTimerSecondsRemaining(): number | null {
  try {
    const start    = JSON.parse(localStorage.getItem("sunguard_timer_start") ?? "null") as number | null;
    const duration = JSON.parse(localStorage.getItem("sunguard_timer_duration") ?? "7200") as number;
    if (start === null) return null;
    const remaining = duration - Math.floor((Date.now() - start) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch { return null; }
}

/**
 * Scan all per-coordinate UV cache keys (sunguard_uv_cache_<lat>_<lon>)
 * and return the most recently written, still-valid entry.
 * This is the same data the Dashboard/Layout writes via writeUVCache().
 */
function readLatestUVFromCache(): { uv: number; locationName: string } | null {
  try {
    const now = Date.now();
    let best: { uv: number; locationName: string; fetchedAt: number } | null = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry = JSON.parse(raw);
      if (!entry || typeof entry.uv !== "number" || !entry.fetchedAt) continue;
      if (now - entry.fetchedAt > CACHE_TTL_MS) continue; // expired
      if (!best || entry.fetchedAt > best.fetchedAt) {
        best = { uv: entry.uv, locationName: entry.locationName ?? "Your Location", fetchedAt: entry.fetchedAt };
      }
    }

    return best ? { uv: best.uv, locationName: best.locationName } : null;
  } catch {
    return null;
  }
}

const OW_API_KEY = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY;

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [username, setUsername]       = useState("");
  const [uvIndex, setUvIndex]         = useState<number | null>(null);
  const [location, setLocation]       = useState("Detecting...");
  const [uvLoading, setUvLoading]     = useState(false);
  const [appCountToday, setAppCountToday]           = useState(0);
  const [timerSecsRemaining, setTimerSecsRemaining] = useState<number | null>(null);

  useEffect(() => {
    const stored     = localStorage.getItem("sunguard_loggedin");
    const storedUser = localStorage.getItem("sunguard_username");
    if (stored === "true" && storedUser) {
      setIsLoggedIn(true);
      setUsername(storedUser);
      loadUV();
    }
    setAppCountToday(getTodayAppCount());
    setTimerSecsRemaining(getTimerSecondsRemaining());
    const tick = setInterval(() => setTimerSecsRemaining(getTimerSecondsRemaining()), 1000);
    return () => clearInterval(tick);
  }, []);

  async function loadUV() {
    // 1. Read the exact same per-coordinate cache keys that Layout/Dashboard writes
    const cached = readLatestUVFromCache();
    if (cached) {
      setUvIndex(cached.uv);
      setLocation(cached.locationName);
      return;
    }

    // 2. Fallback: fetch fresh UV from saved location or GPS
    setUvLoading(true);
    const savedLocation = localStorage.getItem("sunguard_location");
    try {
      if (savedLocation && savedLocation.trim()) {
        setLocation(savedLocation.trim());
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(savedLocation)}&format=json&limit=1`,
          { headers: { "Accept-Language": "en" } }
        ).then((r) => r.json());
        if (geo.length && OW_API_KEY) {
          const { lat, lon } = { lat: parseFloat(geo[0].lat), lon: parseFloat(geo[0].lon) };
          const data = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts,hourly&appid=${OW_API_KEY}&units=metric`
          ).then((r) => r.json());
          setUvIndex(Math.round(data.current.uvi * 10) / 10);
        }
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
            ).then((r) => r.json());
            const addr  = geo.address || {};
            const city  = addr.suburb || addr.city || addr.town || "Your Location";
            const state = addr.state || "";
            setLocation(state ? `${city}, ${state}` : city);
            if (OW_API_KEY) {
              const data = await fetch(
                `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts,hourly&appid=${OW_API_KEY}&units=metric`
              ).then((r) => r.json());
              setUvIndex(Math.round(data.current.uvi * 10) / 10);
            }
            setUvLoading(false);
          },
          () => setUvLoading(false)
        );
        return;
      }
    } catch { /* silently fail */ }
    setUvLoading(false);
  }

  const handleLogout = () => {
    localStorage.removeItem("sunguard_loggedin");
    localStorage.removeItem("sunguard_username");
    setIsLoggedIn(false);
    setUsername("");
  };

  const risk           = uvIndex !== null ? getUVRisk(uvIndex) : null;
  const recommendation = uvIndex !== null ? getRecommendation(uvIndex) : null;

  const timerActive  = timerSecsRemaining !== null && timerSecsRemaining > 0;
  const timerExpired = timerSecsRemaining === 0;
  const timerMins    = timerActive ? Math.ceil(timerSecsRemaining! / 60) : 0;

  let reminderIcon: React.ReactNode;
  let reminderText: string;
  let reminderBg: string;
  let reminderBorder: string;
  let reminderTextColor: string;

  if (timerExpired) {
    reminderIcon      = <Bell size={15} className="text-red-500 animate-pulse" />;
    reminderText      = "Reapply sunscreen now! ⚠️";
    reminderBg        = "#fff1f2";
    reminderBorder    = "#fecdd3";
    reminderTextColor = "#be123c";
  } else if (timerActive && appCountToday > 0) {
    const h = Math.floor(timerMins / 60);
    const m = timerMins % 60;
    const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
    reminderIcon      = <ShieldCheck size={15} className="text-green-500" />;
    reminderText      = `Protected · reapply in ${timeStr}`;
    reminderBg        = "#f0fdf4";
    reminderBorder    = "#bbf7d0";
    reminderTextColor = "#15803d";
  } else if (appCountToday > 0) {
    reminderIcon      = <Droplets size={15} className="text-blue-500" />;
    reminderText      = `Applied ${appCountToday}× today`;
    reminderBg        = "#eff6ff";
    reminderBorder    = "#bfdbfe";
    reminderTextColor = "#1d4ed8";
  } else {
    reminderIcon      = <Bell size={15} className="text-pink-500" />;
    reminderText      = "Reapply sunscreen ⚠️";
    reminderBg        = "white";
    reminderBorder    = "#fce7f3";
    reminderTextColor = "#101828";
  }

  const uvBadgeGrad = risk
    ? `linear-gradient(135deg, ${risk.gradFrom}, ${risk.gradTo})`
    : "linear-gradient(135deg, #FF6900, #f63b9a)";

  return (
    <div className="min-h-screen bg-[#fff9f5] flex flex-col font-sans">

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-orange-100">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundImage: "linear-gradient(136deg, rgb(255,137,4) 0%, rgb(246,51,154) 100%)" }}
            >
              <Sun className="text-white" size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[#101828] text-[20px] font-extrabold tracking-tight">SunGuard</span>
          </div>

          <nav className="hidden md:flex items-center gap-7">
            <a href="#how"      className="text-gray-500 hover:text-orange-500 font-medium text-[15px] transition-colors">How it works</a>
            <a href="#features" className="text-gray-500 hover:text-orange-500 font-medium text-[15px] transition-colors">Features</a>
            <a href="#faq"      className="text-gray-500 hover:text-orange-500 font-medium text-[15px] transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shrink-0">
                    <User size={11} className="text-white" />
                  </div>
                  <span className="text-orange-700 text-[13px] font-semibold truncate max-w-[100px]">{username}</span>
                </div>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 bg-[#FF6900] hover:bg-orange-600 text-white px-4 py-2 rounded-full font-bold text-[13px] transition-colors shadow-md"
                >
                  <Zap size={14} /> My Sun Check
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-full text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-gray-600 hover:text-[#101828] font-semibold text-[14px] transition-colors px-3 py-2">Log in</Link>
                <Link to="/signup" className="bg-[#FF6900] hover:bg-orange-600 text-white px-5 py-2 rounded-full font-bold text-[14px] transition-colors shadow-md">Get started &rarr;</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">

        {/* HERO */}
        <section className="relative overflow-hidden pt-16 pb-24">
          <div className="absolute top-[-80px] right-[-120px] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #FF6900 0%, #f63b9a 100%)" }} />
          <div className="absolute bottom-[-60px] left-[-80px] w-[350px] h-[350px] rounded-full opacity-15 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #155dfc 0%, #9810FA 100%)" }} />

          <div className="max-w-[1200px] mx-auto px-6 relative z-10">

            {/* Logged-in UV widget */}
            {isLoggedIn && (
              <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="rounded-2xl p-6 flex items-center gap-5 border shadow-md"
                  style={{ backgroundColor: risk?.bg ?? "#fff7ed", borderColor: risk?.border ?? "#fed7aa" }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundImage: uvBadgeGrad }}
                  >
                    <Sun size={22} className="text-white mb-0.5" />
                    <span className="text-white text-[20px] font-extrabold leading-none">
                      {uvLoading ? "…" : uvIndex ?? "—"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: risk?.color ?? "#FF6900" }}>Current UV Index</p>
                    <p className="text-[#101828] text-[22px] font-extrabold leading-tight">
                      {uvLoading ? "Loading..." : risk ? `${risk.level} Risk` : "No data"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span className="text-gray-500 text-[13px] truncate max-w-[220px]">{location}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-6 flex items-start gap-4 bg-white border border-gray-200 shadow-md">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
                    <CheckCircle size={22} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-widest text-blue-500 mb-1">Today&apos;s Recommendation</p>
                    <p className="text-[#101828] text-[15px] font-semibold leading-snug">
                      {uvLoading ? "Fetching advice..." : recommendation ?? "Sign in to get personalised advice."}
                    </p>
                    <Link to="/dashboard" className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-bold text-[#FF6900] hover:underline">
                      <TrendingUp size={13} /> View full forecast
                    </Link>
                  </div>
                </div>
            </div>
            )}

            <div className="flex flex-col lg:flex-row items-center gap-12">

              {/* Left copy */}
              <div className="flex-1 max-w-[580px]">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 font-bold text-[13px] mb-6 border border-orange-200">
                  ☀️ Real-time UV for your exact location
                </div>

                <h1 className="text-[52px] md:text-[68px] font-extrabold text-[#101828] leading-[1.05] tracking-tight mb-5">
                  Don&apos;t get <br />
                  <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #FF6900, #f63b9a)" }}>
                    fried 🔥
                  </span>
                </h1>

                <p className="text-[18px] text-gray-600 mb-8 leading-relaxed">
                  SunGuard tells you the <strong>live UV level</strong> wherever you are,
                  reminds you to reapply sunscreen, and keeps your skin healthy &mdash;
                  so you can be outside longer, worry-free.
                </p>

                <div className="flex flex-wrap gap-6 mb-8">
                  {[
                    { emoji: "🌞", label: "Live UV Index" },
                    { emoji: "📍", label: "Your exact location" },
                    { emoji: "⏰", label: "Reapply reminders" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="text-[20px]">{s.emoji}</span>
                      <span className="text-gray-700 font-semibold text-[14px]">{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {isLoggedIn ? (
                    <Link
                      to="/dashboard"
                      className="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-2xl text-[17px] font-bold transition-all hover:scale-[1.03] shadow-lg"
                      style={{ backgroundImage: "linear-gradient(135deg, #FF6900, #f63b9a)" }}
                    >
                      <Zap size={20} /> Check my UV now
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/signup"
                        className="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-2xl text-[17px] font-bold transition-all hover:scale-[1.03] shadow-lg"
                        style={{ backgroundImage: "linear-gradient(135deg, #FF6900, #f63b9a)" }}
                      >
                        Start for free <ChevronRight size={20} />
                      </Link>
                      <Link
                        to="/login"
                        className="flex items-center justify-center px-6 py-4 rounded-2xl text-[16px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        I already have an account
                      </Link>
                    </>
                  )}
                </div>

                {isLoggedIn && (
                  <div className="mt-6 inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
                    <span className="text-[22px]">👋</span>
                    <div>
                      <p className="text-green-800 text-[13px] font-bold">Hey {username}, you&apos;re back!</p>
                      <p className="text-green-600 text-[12px]">Check today&apos;s UV levels in My Sun Check.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right image with dynamic floating badges */}
              <div className="flex-1 w-full max-w-[520px] relative">
                <div className="rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3]">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1717941826824-458477f5a65d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwb3V0ZG9vcnMlMjBzdW5ueSUyMHN1bW1lciUyMGJlYWNofGVufDF8fHx8MTc3MzM4NzM4NXww&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Friends outdoors in the sun"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Bottom-left: dynamic UV badge */}
                <div
                  className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3 border"
                  style={{ borderColor: risk?.border ?? "#fed7aa" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundImage: uvBadgeGrad }}
                  >
                    <Sun size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 font-medium">Right now</p>
                    {uvLoading ? (
                      <p className="text-[14px] font-extrabold text-gray-400">Loading...</p>
                    ) : uvIndex !== null ? (
                      <p className="text-[15px] font-extrabold" style={{ color: risk?.color ?? "#FF6900" }}>
                        UV {uvIndex} &mdash; {risk?.level}
                      </p>
                    ) : (
                      <p className="text-[15px] font-extrabold text-[#101828]">UV — —</p>
                    )}
                  </div>
                </div>

                {/* Top-right: dynamic reminder badge */}
                <div
                  className="absolute -top-4 -right-4 rounded-2xl shadow-xl px-4 py-2.5 flex items-center gap-2 border transition-all"
                  style={{ backgroundColor: reminderBg, borderColor: reminderBorder }}
                >
                  {reminderIcon}
                  <p className="text-[13px] font-bold" style={{ color: reminderTextColor }}>
                    {reminderText}
                  </p>
                  {timerActive && (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-20 bg-white">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div id="features">
                <p className="text-orange-500 font-bold text-[13px] uppercase tracking-widest mb-2">Super simple</p>
                <h2 className="text-[32px] md:text-[38px] font-extrabold text-[#101828] tracking-tight mb-10">3 steps to safer sun time</h2>
                <div className="flex flex-col gap-5">
                  {[
                    { step: "01", emoji: "📲", color: "from-orange-400 to-pink-500", bg: "bg-orange-50", title: "Share your location", desc: "SunGuard pulls live UV data for wherever you are — beach, park, city, wherever." },
                    { step: "02", emoji: "🧬", color: "from-blue-400 to-violet-500", bg: "bg-blue-50",   title: "Set your skin type",  desc: "We crunch your skin tone + the UV level to give you advice that actually fits you." },
                    { step: "03", emoji: "⏰",        color: "from-green-400 to-teal-500",  bg: "bg-green-50",  title: "Get reminders",       desc: "Set a sunscreen timer and we’ll ping you when it’s time to reapply. Easy." },
                  ].map((s) => (
                    <div key={s.step} className={`${s.bg} rounded-2xl p-6 relative overflow-hidden flex items-start gap-5`}>
                      <span className="absolute top-3 right-5 text-[48px] font-extrabold text-black/5 select-none leading-none">{s.step}</span>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-[22px] shrink-0 shadow-md`}>{s.emoji}</div>
                      <div>
                        <h3 className="text-[17px] font-extrabold text-[#101828] mb-1">{s.title}</h3>
                        <p className="text-gray-600 text-[14px] leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-orange-500 font-bold text-[13px] uppercase tracking-widest mb-2">Why it slaps</p>
                <h2 className="text-[32px] md:text-[38px] font-extrabold text-[#101828] tracking-tight mb-10">Built for people who <br /> actually go outside</h2>
                <div className="flex flex-col gap-4">
                  {[
                    { icon: Activity, grad: "from-blue-400 to-violet-500",  title: "Live UV tracking",         desc: "Minute-by-minute UV index for your exact spot, not just your city." },
                    { icon: MapPin,   grad: "from-orange-400 to-pink-500",  title: "Interactive UV map",        desc: "Tap anywhere on the map to see UV levels — great for planning your day." },
                    { icon: Smile,    grad: "from-green-400 to-teal-500",   title: "Skin type personalisation", desc: "Your skin tone = your advice. No generic tips, only what applies to you." },
                    { icon: Bell,     grad: "from-pink-400 to-rose-500",    title: "Sunscreen timer",           desc: "Tap once when you apply sunscreen and we remind you to reapply in 2 hours." },
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-4 p-5 bg-[#fff9f5] rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.grad} flex items-center justify-center shrink-0 shadow-sm`}>
                        <f.icon size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[15px] font-extrabold text-[#101828] mb-0.5">{f.title}</p>
                        <p className="text-gray-500 text-[14px] leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="py-16 bg-[#fff9f5]">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center mb-10">
              <p className="text-orange-500 font-bold text-[13px] uppercase tracking-widest mb-2">People are loving it</p>
              <h2 className="text-[32px] font-extrabold text-[#101828]">Real talk from real users</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { quote: "I literally got a sunburn every summer before this app. Now I actually reapply.", name: "Mia, 21 🇦🇺" },
                { quote: "The UV map is so sick. I check it before every surf session.",                    name: "Jake, 19 🏄" },
                { quote: "Finally an app that doesn't talk to me like I'm 50. The reminders are so helpful.", name: "Priya, 22 ✨" },
              ].map((t, i) => (
                <div key={i} className="bg-white border border-orange-100 rounded-3xl p-7">
                  <p className="text-[32px] text-orange-400 leading-none mb-2">&ldquo;</p>
                  <p className="text-gray-700 text-[15px] leading-relaxed mb-5">{t.quote}</p>
                  <p className="text-[13px] font-bold text-gray-500">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 bg-white">
          <div className="max-w-[760px] mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-orange-500 font-bold text-[13px] uppercase tracking-widest mb-2">Got questions?</p>
              <h2 className="text-[36px] font-extrabold text-[#101828]">Quick answers</h2>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { q: "Is SunGuard free?",                  a: "Yep, 100% free. No hidden charges, no premium tier." },
                { q: "Does it work outside Australia?",     a: "The UV data works globally. The interactive map is scoped to Australia for now, but UV readings work anywhere." },
                { q: "Why do I need to set my skin type?",  a: "Darker skin tones have more melanin protection, lighter tones burn faster. Your skin type lets us give you accurate safe-exposure windows." },
                { q: "How often does UV data update?",      a: "Live data is fetched fresh every time and cached for 60 minutes to keep it fast without hammering the API." },
              ].map((item, i) => (
                <div key={i} className="bg-[#fff9f5] border border-gray-100 rounded-2xl px-6 py-5">
                  <p className="text-[15px] font-extrabold text-[#101828] mb-1.5">{item.q}</p>
                  <p className="text-gray-500 text-[14px] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0" style={{ backgroundImage: "linear-gradient(135deg, #FF6900 0%, #f63b9a 60%, #9810FA 100%)" }} />
          <div className="max-w-[700px] mx-auto px-6 relative z-10 text-center">
            {isLoggedIn ? (
              <>
                <p className="text-white/80 text-[14px] font-bold uppercase tracking-widest mb-4">You&apos;re already in 🤙</p>
                <h2 className="text-[42px] md:text-[52px] font-extrabold text-white mb-5 leading-tight">Hey {username}, <br />go check your UV</h2>
                <p className="text-white/80 text-[18px] mb-10">Your Sun Check is ready and waiting.</p>
                <Link to="/dashboard" className="inline-flex items-center gap-2 bg-white px-10 py-4 rounded-2xl text-[18px] font-extrabold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl" style={{ color: "#FF6900" }}>
                  <Zap size={22} /> Open My Sun Check
                </Link>
              </>
            ) : (
              <>
                <p className="text-white/80 text-[14px] font-bold uppercase tracking-widest mb-4">It&apos;s free, always</p>
                <h2 className="text-[42px] md:text-[52px] font-extrabold text-white mb-5 leading-tight">Stop guessing. <br />Start checking. ☀️</h2>
                <p className="text-white/80 text-[18px] mb-10">Takes 30 seconds to sign up. Your skin will thank you.</p>
                <Link to="/signup" className="inline-flex items-center gap-2 bg-white px-10 py-4 rounded-2xl text-[18px] font-extrabold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl" style={{ color: "#FF6900" }}>
                  Create my free account <ChevronRight size={22} />
                </Link>
              </>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0f0f0f] text-white py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <Sun className="text-orange-400" size={22} strokeWidth={2} />
            <span className="text-[18px] font-extrabold tracking-tight">SunGuard</span>
          </div>
          <div className="text-gray-500 text-[13px]">&copy; {new Date().getFullYear()} SunGuard. Made with ☕ for sun-lovers.</div>
          <div className="flex gap-6 text-[13px] text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
