import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle, Clock, History, Droplets, Flame, Trophy,
  Calendar, Edit2, X, Loader2, WifiOff, Sun, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { useAppContext } from "./Layout";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const HIGH_UV = 3; // peak UV threshold

function uvLabel(uv: number): string {
  if (uv <= 2)  return "Low";
  if (uv <= 5)  return "Moderate";
  if (uv <= 7)  return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

function uvColor(uv: number): string {
  if (uv <= 2)  return "#16a34a";
  if (uv <= 5)  return "#ca8a04";
  if (uv <= 7)  return "#ea580c";
  if (uv <= 10) return "#dc2626";
  return "#7c3aed";
}

/**
 * Given today's Application logs, determine how many 2-hr peak-hour slots
 * have been covered and how many are required.
 *
 * Peak hours = any hour where UV is stored >= HIGH_UV.
 * We use the application timestamps to decide coverage:
 *   - Each application "covers" from its time up to (time + 2 hours).
 *   - We then check whether every 2-hr block inside today's peak window
 *     is covered by at least one application.
 *
 * For a simpler UX approach we instead:
 *   - Build 2-hr slots starting from the first peak-hour app or 10:00
 *     (typical peak start), capped at the last peak hour.
 *   - A slot is covered if there is an application within 2 hrs of the
 *     slot start.
 *
 * For MVP / frontend-only we use the hourlyForecast from context to know
 * which hours today are peak, then check if the user has applied at least
 * once in every 2-hr window during those hours.
 */
function computePeakCoverage(
  peakHours: number[],                // 0-23 hour numbers that are peak today
  appTimestamps: Date[],              // sorted application timestamps for today
  timerDurationSec: number
): { required: number; covered: number; slots: { label: string; covered: boolean }[] } {
  if (peakHours.length === 0) return { required: 0, covered: 0, slots: [] };

  const minPeak = Math.min(...peakHours);
  const maxPeak = Math.max(...peakHours);

  // Build 2-hr slots spanning the peak window
  const slots: { label: string; covered: boolean }[] = [];
  for (let h = minPeak; h <= maxPeak; h += 2) {
    const slotEnd = Math.min(h + 2, maxPeak + 1);
    const label   = `${String(h).padStart(2, "0")}:00–${String(slotEnd).padStart(2, "0")}:00`;
    // A slot is covered if at least one application falls within [h, slotEnd)
    // or a prior application's coverage window extends into this slot.
    const covered = appTimestamps.some((ts) => {
      const appHour    = ts.getHours() + ts.getMinutes() / 60;
      const coverUntil = appHour + timerDurationSec / 3600;
      return coverUntil >= h && appHour < slotEnd;
    });
    slots.push({ label, covered });
  }

  const required = slots.length;
  const covered  = slots.filter((s) => s.covered).length;
  return { required, covered, slots };
}

interface ProtectionLog {
  id: string;
  message: string;
  logged_at: string;
  type: "Application" | "Alert";
  duration_seconds?: number;
  actual_duration_seconds?: number;
  uv_index_at_application?: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCreditedDate: string | null;
  lastHighUVDate: string | null;
  streakBroken: boolean;
}

const LS_TIMER_START    = "sunguard_timer_start";
const LS_TIMER_DURATION = "sunguard_timer_duration";
const LS_LOGS_CACHE     = "sunguard_logs_cache";
const LS_STREAK_CACHE   = "sunguard_streak_cache";

function loadLocal<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r !== null ? JSON.parse(r) as T : fallback; }
  catch { return fallback; }
}
function saveLocal(key: string, v: unknown) { localStorage.setItem(key, JSON.stringify(v)); }

function getSecondsRemaining(): number | null {
  const start    = loadLocal<number | null>(LS_TIMER_START, null);
  const duration = loadLocal<number>(LS_TIMER_DURATION, 7200);
  if (start === null) return null;
  const remaining = duration - Math.floor((Date.now() - start) / 1000);
  return remaining > 0 ? remaining : 0;
}
function startTimer() { saveLocal(LS_TIMER_START, Date.now()); }
function stopTimer()  { localStorage.removeItem(LS_TIMER_START); }

async function apiFetchLogs(token: string): Promise<ProtectionLog[]> {
  const r = await fetch(`${backendUrl}/logs?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("logs fetch failed");
  return r.json();
}

async function apiAddLog(
  token: string,
  payload: { type: "Application" | "Alert"; message: string; duration_seconds?: number; uv_index_at_application?: number }
): Promise<{ log: ProtectionLog; streak: StreakData | null }> {
  const r = await fetch(`${backendUrl}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("log save failed");
  return r.json();
}

async function apiCloseWindow(token: string, stopped_at_ms: number) {
  await fetch(`${backendUrl}/logs/close-window`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ stopped_at_ms }),
  });
}

async function apiClearLogs(token: string) {
  const r = await fetch(`${backendUrl}/logs`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("clear failed");
}

async function apiFetchStreak(token: string): Promise<StreakData> {
  const r = await fetch(`${backendUrl}/logs/streak`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("streak fetch failed");
  return r.json();
}

export default function RemindersPage() {
  const { uvData } = useAppContext();
  const { currentUV, hourlyForecast } = uvData;
  const isHighUV = currentUV >= HIGH_UV;

  const [timerDuration, setTimerDuration]         = useState(() => loadLocal<number>(LS_TIMER_DURATION, 7200));
  const [showTimerEditModal, setShowTimerEditModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal]       = useState(false);
  const initialRemaining                            = getSecondsRemaining();
  const [timeRemaining, setTimeRemaining]           = useState<number>(initialRemaining ?? timerDuration);
  const [timerRunning, setTimerRunning]             = useState<boolean>(initialRemaining !== null && initialRemaining > 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [logs, setLogs]                   = useState<ProtectionLog[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastHighUVDate, setLastHighUV]   = useState<string | null>(null);

  const [loading, setLoading]           = useState(true);
  const [offline, setOffline]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [streakBroken, setStreakBroken] = useState(false);

  useEffect(() => {
    const remaining = getSecondsRemaining();
    if (remaining !== null && remaining > 0) {
      setTimeRemaining(remaining); setTimerRunning(true);
    } else if (remaining === 0) {
      stopTimer(); setTimerRunning(false); setTimeRemaining(timerDuration); setShowTimeUpModal(true);
    }

    const token = localStorage.getItem("sunguard_token");
    if (!token) { setLoading(false); return; }

    Promise.all([apiFetchLogs(token), apiFetchStreak(token)])
      .then(([fetchedLogs, streakData]) => {
        setLogs(fetchedLogs);
        setCurrentStreak(streakData.currentStreak);
        setLongestStreak(streakData.longestStreak);
        setLastHighUV(streakData.lastHighUVDate);
        setStreakBroken(streakData.streakBroken);
        setOffline(false);
        saveLocal(LS_LOGS_CACHE, fetchedLogs);
        saveLocal(LS_STREAK_CACHE, streakData);
      })
      .catch(() => {
        setOffline(true);
        const cl = loadLocal<ProtectionLog[]>(LS_LOGS_CACHE, []);
        const cs = loadLocal<StreakData>(LS_STREAK_CACHE, { currentStreak: 0, longestStreak: 0, lastCreditedDate: null, lastHighUVDate: null, streakBroken: false });
        setLogs(cl); setCurrentStreak(cs.currentStreak); setLongestStreak(cs.longestStreak);
        setLastHighUV(cs.lastHighUVDate); setStreakBroken(cs.streakBroken);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { saveLocal(LS_TIMER_DURATION, timerDuration); }, [timerDuration]);

  useEffect(() => {
    if (!timerRunning) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      const rem = getSecondsRemaining();
      if (rem === null || rem <= 0) {
        clearInterval(intervalRef.current!);
        stopTimer(); setTimerRunning(false); setTimeRemaining(timerDuration);
        addLog("Alert", "Timer complete — time to reapply!");
        setShowTimeUpModal(true);
      } else {
        setTimeRemaining(rem);
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, timerDuration]);

  const addLog = useCallback(async (
    type: "Application" | "Alert",
    message: string,
    durationSeconds?: number,
    uvIndex?: number
  ) => {
    const token = localStorage.getItem("sunguard_token");
    const tempLog: ProtectionLog = {
      id: `temp-${Date.now()}`, type, message,
      logged_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      uv_index_at_application: uvIndex,
    };
    setLogs((prev) => [tempLog, ...prev]);
    if (!token || offline) return;
    setSaving(true);
    try {
      const { log: saved, streak } = await apiAddLog(token, { type, message, duration_seconds: durationSeconds, uv_index_at_application: uvIndex });
      setLogs((prev) => prev.map((l) => (l.id === tempLog.id ? saved : l)));
      if (streak) {
        setCurrentStreak(streak.currentStreak);
        setLongestStreak(streak.longestStreak);
        saveLocal(LS_STREAK_CACHE, streak);
      }
    } catch (err) {
      console.error("[addLog]", err);
    } finally {
      setSaving(false);
    }
  }, [offline]);

  const recordApplication = () => {
    const now     = new Date();
    const timeStr = now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
    const uvStr   = ` (UV ${currentUV} — ${uvLabel(currentUV)})`;
    addLog("Application", `Applied SPF 50+ at ${timeStr}${uvStr}`, timerDuration, currentUV);
    startTimer(); setTimerRunning(true); setTimeRemaining(timerDuration);
  };

  const stopTimerManually = async () => {
    const stoppedAt = Date.now();
    stopTimer(); setTimerRunning(false); setTimeRemaining(timerDuration);
    const token = localStorage.getItem("sunguard_token");
    if (token) await apiCloseWindow(token, stoppedAt).catch(() => null);
    setLogs((prev) => {
      const copy = [...prev];
      const openIdx = copy.findIndex((l) => l.type === "Application" && !l.actual_duration_seconds);
      if (openIdx !== -1) {
        const open    = copy[openIdx];
        const start   = new Date(open.logged_at).getTime();
        const elapsed = Math.round(Math.min(stoppedAt - start, (open.duration_seconds || 7200) * 1000) / 1000);
        copy[openIdx] = { ...open, actual_duration_seconds: elapsed };
      }
      return copy;
    });
  };

  const updateTimerDuration = (seconds: number) => {
    setTimerDuration(seconds); stopTimer();
    setTimerRunning(false); setTimeRemaining(seconds);
    setShowTimerEditModal(false);
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayApps = logs.filter((l) => l.type === "Application" && l.logged_at.slice(0, 10) === todayStr);
  const applicationsToday = todayApps.length;

  const minutesProtected = todayApps.reduce((sum, l) => {
    if (l.actual_duration_seconds) return sum + l.actual_duration_seconds / 60;
    const timerStart = loadLocal<number | null>(LS_TIMER_START, null);
    if (timerRunning && timerStart) {
      return sum + Math.round((Date.now() - timerStart) / 1000 / 60);
    }
    return sum;
  }, 0);
  const hoursProtected = (minutesProtected / 60).toFixed(1);

  // Peak hours from today's hourly forecast
  const peakHours = hourlyForecast
    .filter((h) => h.uv >= HIGH_UV)
    .map((h) => parseInt(h.time.split(":")[0], 10));

  // Today's application timestamps
  const appTimestamps = todayApps
    .map((l) => new Date(l.logged_at))
    .sort((a, b) => a.getTime() - b.getTime());

  // Peak coverage calculation
  const peakCoverage = computePeakCoverage(peakHours, appTimestamps, timerDuration);
  const allPeakSlotsCovered = peakCoverage.required > 0
    ? peakCoverage.covered >= peakCoverage.required
    : true; // no peak hours today → streak safe

  // Weekly grid
  const daysOfWeek   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today        = new Date();
  const dow          = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weeklyData   = daysOfWeek.map((_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() + mondayOffset + i);
    const dayStr  = day.toISOString().slice(0, 10);
    const dayLogs = logs.filter((l) => l.type === "Application" && l.logged_at.slice(0, 10) === dayStr);
    return {
      hasAny:    dayLogs.length > 0,
      hasHighUV: dayLogs.some((l) => (l.uv_index_at_application ?? 0) >= HIGH_UV),
      count:     dayLogs.length,
    };
  });
  const todayIndex = dow === 0 ? 6 : dow - 1;

  // Timer ring helpers
  const hrs  = Math.floor(timeRemaining / 3600);
  const mins = Math.floor((timeRemaining % 3600) / 60);
  const secs = timeRemaining % 60;
  const timeDisplay = timerRunning
    ? `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`
    : "--:--:--";
  const timerProgress = timerRunning ? timeRemaining / timerDuration : 1;
  const R = 54; const C = 2 * Math.PI * R;
  const strokeColor = timerRunning
    ? (timerProgress > 0.5 ? "#FF6900" : timerProgress > 0.25 ? "#ca8a04" : "#dc2626")
    : "#e5e7eb";

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const t = d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
    return d.toISOString().slice(0, 10) === todayStr
      ? t
      : d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + " " + t;
  };

  const fmtDuration = (s: number) =>
    s >= 3600 ? `${(s / 3600).toFixed(1).replace(".0", "")}h ${Math.round((s % 3600) / 60)}m`
              : `${Math.round(s / 60)}m`;

  return (
    <div className="flex flex-col gap-6">

      {/* UV status banner */}
      {isHighUV ? (
        <div className="bg-[#fff7ed] border border-[#ff6900] rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#FF6900] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#7e2a0c] text-[14px] font-semibold">High UV — Protection Required</p>
            <p className="text-[#9f2d00] text-[14px]">UV {currentUV} ({uvLabel(currentUV)}). Apply SPF 50+ every 2 hrs during peak hours to maintain your streak.</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#f0fdf4] border border-green-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Sun size={16} className="text-green-500 shrink-0" />
          <p className="text-green-700 text-[13px]">UV {currentUV} ({uvLabel(currentUV)}) — Low UV right now. No peak hours at the moment.</p>
        </div>
      )}

      {offline && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <WifiOff size={16} className="text-gray-400 shrink-0" />
          <p className="text-gray-500 text-[13px]">You&apos;re offline — logs will sync when you reconnect.</p>
        </div>
      )}

      {streakBroken && (
        <div className="bg-[#fff1f2] border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Flame size={16} className="text-red-400 shrink-0" />
          <p className="text-red-600 text-[13px] font-medium">Streak reset — you missed a peak-hour window yesterday. Start fresh today!</p>
        </div>
      )}

      {/* ── ROW 1: Timer + Streak ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Timer card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[#0a0a0a] text-[16px] font-semibold flex items-center gap-2">
              <Clock size={18} className="text-[#FF6900]" /> Reapplication Timer
            </h3>
            <button
              onClick={() => setShowTimerEditModal(true)}
              className="text-[#6a7282] hover:text-[#101828] flex items-center gap-1.5 text-[13px] font-medium bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-black/5"
            >
              <Edit2 size={13} /> Edit
            </button>
          </div>
          <p className="text-[#717182] text-[13px] mb-5">
            {timerDuration >= 3600 ? `${timerDuration / 3600}hr` : `${timerDuration / 60}min`} interval — persists across refreshes
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 mb-5 flex-1">
            <div className="relative w-[130px] h-[130px] shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <circle cx="60" cy="60" r={R} fill="none" stroke={strokeColor} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={C}
                  strokeDashoffset={C * (1 - timerProgress)}
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 1s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock size={16} className={timerRunning ? "text-[#FF6900] mb-1" : "text-gray-300 mb-1"} />
                <span className="text-[#101828] text-[20px] font-bold tracking-wide leading-none">
                  {timerRunning ? `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}` : "--:--"}
                </span>
                {timerRunning && <span className="text-[#6a7282] text-[11px] mt-0.5">{String(secs).padStart(2,"0")}s</span>}
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1 w-full">
              <p className="text-[#6a7282] text-[13px]">
                {timerRunning ? `Reapplication due in ${timeDisplay}` : "Apply sunscreen to start the timer"}
              </p>
              {timerRunning && (
                <div className="flex items-center gap-2 text-[13px]">
                  <div className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                  <span className="text-[#16a34a] font-medium">Protected now</span>
                  {isHighUV && (
                    <span className="ml-auto text-[12px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: uvColor(currentUV) + "20", color: uvColor(currentUV) }}>
                      UV {currentUV} · {uvLabel(currentUV)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            <button
              onClick={recordApplication}
              className="w-full bg-[#FF6900] hover:bg-[#E55E00] text-white rounded-xl px-5 py-4 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Droplets size={20} />}
              <span className="text-[15px] font-semibold">{saving ? "Saving..." : "I Applied Sunscreen"}</span>
            </button>
            {timerRunning && (
              <button
                onClick={stopTimerManually}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl px-5 py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck size={16} /> <span className="text-[14px] font-medium">Stop Protection Window</span>
              </button>
            )}
          </div>
        </div>

        {/* Streak card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <h3 className="text-[#0a0a0a] text-[16px] font-semibold mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-[#FF6900]" /> Protection Streak
          </h3>

          {/* Top row: Today's count + Day streak */}
          {loading ? (
            <div className="w-full h-24 bg-gray-50 rounded-2xl animate-pulse mb-4" />
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Today's applications box */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-[#fff7ed] to-[#ffe4c4] border border-[#ffcf99] flex flex-col items-center justify-center gap-1">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm mb-1">
                  <Droplets size={20} className="text-[#FF6900]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[32px] font-extrabold text-[#101828] leading-none">{applicationsToday}</span>
                  <span className="text-[#9f2d00] text-[12px] font-bold">×</span>
                </div>
                <span className="text-[#9f2d00] text-[11px] font-semibold text-center leading-tight">Applied today</span>
              </div>

              {/* Day streak box */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-[#faf5ff] to-[#ede9fe] border border-[#c4b5fd] flex flex-col items-center justify-center gap-1">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm mb-1">
                  <Flame size={20} className="text-[#7c3aed]" fill="#7c3aed" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[32px] font-extrabold text-[#101828] leading-none">{currentStreak}</span>
                  <span className="text-[#5b21b6] text-[12px] font-bold">days</span>
                </div>
                <span className="text-[#5b21b6] text-[11px] font-semibold text-center leading-tight">Day streak</span>
              </div>
            </div>
          )}

          {/* Streak rule explainer */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-black/5">
            <p className="text-[#4a5565] text-[12px] font-semibold mb-0.5">How streaks work</p>
            <p className="text-[#6a7282] text-[12px] leading-snug">
              A day is credited to your streak only if you apply sunscreen in <strong>every 2-hr peak UV window</strong> (UV&nbsp;≥&nbsp;3) that day.
            </p>
          </div>

          {/* Peak-hour coverage progress */}
          {peakCoverage.required > 0 ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[#4a5565] text-[12px] font-semibold">Today's peak-hour coverage</p>
                <span className={`text-[12px] font-bold ${
                  allPeakSlotsCovered ? "text-green-600" : "text-[#FF6900]"
                }`}>
                  {peakCoverage.covered}/{peakCoverage.required} slots
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${peakCoverage.required > 0 ? (peakCoverage.covered / peakCoverage.required) * 100 : 0}%`,
                    background: allPeakSlotsCovered ? "#16a34a" : "#FF6900",
                  }}
                />
              </div>
              {/* Slot chips */}
              <div className="flex flex-wrap gap-1.5">
                {peakCoverage.slots.map((slot, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      slot.covered
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-orange-50 border-orange-200 text-orange-700"
                    }`}
                  >
                    {slot.covered
                      ? <CheckCircle2 size={10} className="text-green-500" />
                      : <Clock size={10} className="text-orange-400" />}
                    {slot.label}
                  </div>
                ))}
              </div>
              {allPeakSlotsCovered && (
                <p className="text-green-600 text-[12px] font-semibold mt-2 flex items-center gap-1">
                  <CheckCircle2 size={13} /> All peak windows covered — streak will be credited! 🎉
                </p>
              )}
            </div>
          ) : (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-green-700 text-[12px] font-medium">No peak UV hours today — your streak is safe automatically.</p>
            </div>
          )}

          <p className="text-[#6a7282] text-[13px] flex items-center gap-1.5 mb-4">
            <Trophy size={13} /> Best: <span className="font-bold text-[#101828] ml-1">{longestStreak} days</span>
          </p>

          {/* Weekly grid */}
          <div>
            <p className="text-[#4a5565] text-[13px] font-semibold mb-3">This Week</p>
            <div className="flex justify-between items-end gap-1 w-full">
              {daysOfWeek.map((day, i) => {
                const { hasAny, hasHighUV, count } = weeklyData[i];
                const isToday = i === todayIndex;
                return (
                  <div key={day} className="flex flex-col items-center gap-1 flex-1">
                    {/* Application count badge */}
                    {count > 0 && (
                      <span className="text-[10px] font-bold" style={{ color: hasHighUV ? "#FF6900" : "#16a34a" }}>
                        {count}×
                      </span>
                    )}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      hasHighUV ? "bg-[#fff7ed] border-2 border-[#FF6900] shadow-sm scale-110"
                      : hasAny   ? "bg-[#f0fdf4] border-2 border-[#16a34a]"
                      : isToday  ? "bg-white border-2 border-dashed border-[#FF6900]"
                      : "bg-gray-50 border border-gray-200"
                    }`}>
                      <Flame
                        size={16}
                        className={hasHighUV ? "text-[#FF6900]" : hasAny ? "text-[#16a34a]" : "text-gray-300"}
                        fill={hasHighUV ? "#FF6900" : hasAny ? "#16a34a" : "transparent"}
                      />
                    </div>
                    <span className={`text-[10px] ${
                      isToday  ? "font-bold text-[#FF6900]"
                      : hasAny ? "font-semibold text-[#101828]"
                      : "text-gray-400"
                    }`}>{day}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <Flame size={11} fill="#FF6900" className="text-[#FF6900]" />
                <span className="text-[11px] text-[#6a7282]">Peak UV day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame size={11} fill="#16a34a" className="text-[#16a34a]" />
                <span className="text-[11px] text-[#6a7282]">No peak UV</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Stats + Activity Log ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Today's stats */}
        <div className="bg-white rounded-2xl border border-black/10 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={18} className="text-[#4a5565]" />
            <h3 className="text-[#0a0a0a] text-[16px] font-medium">Today&apos;s Stats</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-[#f0fdf4] rounded-xl py-4 px-5 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[12px] mb-1">Times Applied Today</p>
                {loading ? <div className="h-7 w-10 bg-gray-100 rounded animate-pulse" /> :
                  <p className="text-[#166534] text-[26px] font-bold">{applicationsToday}</p>}
              </div>
              <Droplets size={26} className="text-[#16a34a] opacity-40" />
            </div>

            <div className="bg-[#eff6ff] rounded-xl py-4 px-5 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[12px] mb-1">Actual Time Protected</p>
                {loading ? <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" /> :
                  <p className="text-[#1d4ed8] text-[26px] font-bold">{hoursProtected}h</p>}
                <p className="text-[#6a7282] text-[11px] mt-0.5">Based on actual coverage windows</p>
              </div>
              <Clock size={26} className="text-[#3b82f6] opacity-40" />
            </div>

            <div className="bg-gray-50 rounded-xl py-3 px-4 flex items-center justify-between border border-black/5">
              <div>
                <p className="text-[#4a5565] text-[12px] mb-0.5">Current UV</p>
                <p className="font-bold text-[18px]" style={{ color: uvColor(currentUV) }}>
                  {currentUV} <span className="text-[13px]">{uvLabel(currentUV)}</span>
                </p>
              </div>
              <Sun size={26} style={{ color: uvColor(currentUV) }} className="opacity-60" />
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-[#4a5565]" />
              <h3 className="text-[#0a0a0a] text-[16px] font-medium">Activity Log</h3>
            </div>
            {logs.length > 0 && !loading && (
              <button onClick={async () => {
                if (!window.confirm("Clear all logs? This cannot be undone.")) return;
                const token = localStorage.getItem("sunguard_token");
                if (token) await apiClearLogs(token).catch(() => null);
                setLogs([]); saveLocal(LS_LOGS_CACHE, []);
              }} className="text-[12px] text-[#6a7282] hover:text-red-500 transition-colors">Clear</button>
            )}
          </div>
          <div className="overflow-y-auto min-h-[150px] max-h-[340px]">
            {loading ? (
              <div className="flex flex-col gap-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
            ) : logs.length === 0 ? (
              <p className="text-[#717182] text-[14px] text-center py-10">No activity yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {logs.map((log) => {
                  const uvVal = log.uv_index_at_application;
                  const isApp = log.type === "Application";
                  return (
                    <div key={log.id} className={`rounded-xl px-4 py-3 border ${
                      log.type === "Alert" ? "bg-[#fff7ed] border-[#ffedd4]" : "bg-[#fafafa] border-black/5"
                    }`}>
                      <div className="flex justify-between items-start">
                        <p className={`text-[13px] font-medium leading-tight ${
                          log.type === "Alert" ? "text-[#9f2d00]" : "text-[#101828]"
                        }`}>{log.message}</p>
                        <span className="text-[#6a7282] text-[11px] whitespace-nowrap ml-2 mt-0.5">{formatDate(log.logged_at)}</span>
                      </div>
                      {isApp && (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {log.actual_duration_seconds ? (
                            <span className="text-[11px] text-[#16a34a] font-medium flex items-center gap-1">
                              <ShieldCheck size={11} /> Protected {fmtDuration(log.actual_duration_seconds)}
                            </span>
                          ) : timerRunning ? (
                            <span className="text-[11px] text-[#FF6900] font-medium flex items-center gap-1">
                              <Clock size={11} className="animate-pulse" /> Active now
                            </span>
                          ) : null}
                          {uvVal !== undefined && uvVal !== null && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: uvColor(uvVal) + "18", color: uvColor(uvVal) }}>
                              UV {uvVal} · {uvLabel(uvVal)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timer Duration Modal */}
      {showTimerEditModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-xl">
            <button onClick={() => setShowTimerEditModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            <h3 className="text-[18px] font-bold mb-1">Set Timer Duration</h3>
            <p className="text-[#6a7282] text-[13px] mb-5">Changing duration resets the current timer.</p>
            <div className="flex flex-col gap-3">
              {[
                { label: "30 min — Swimming / Heavy Sweating", value: 1800 },
                { label: "1 hour — Outdoor Activity",         value: 3600 },
                { label: "2 hours — Daily Wear",              value: 7200 },
              ].map(({ label, value }) => (
                <button key={value} onClick={() => updateTimerDuration(value)}
                  className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${
                    timerDuration === value ? "border-[#FF6900] bg-[#fff7ed] text-[#FF6900]" : "border-gray-200 hover:border-[#FF6900] hover:bg-gray-50 text-gray-700"
                  }`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Up Modal */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="w-16 h-16 bg-[#fff7ed] rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets size={30} className="text-[#FF6900]" />
            </div>
            <h2 className="text-[20px] font-bold mb-2">Time to Reapply!</h2>
            {isHighUV && (
              <p className="text-[13px] font-semibold mb-2" style={{ color: uvColor(currentUV) }}>
                UV {currentUV} — {uvLabel(currentUV)} conditions right now
              </p>
            )}
            <p className="text-gray-500 mb-6 text-[14px]">Your protection window has expired. Apply SPF 50+ to cover this peak-hour slot and protect your streak.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowTimeUpModal(false); recordApplication(); }}
                className="w-full bg-[#FF6900] hover:bg-[#E55E00] text-white py-3 rounded-xl font-bold cursor-pointer">
                I Applied It!
              </button>
              <button onClick={() => setShowTimeUpModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold cursor-pointer">
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
