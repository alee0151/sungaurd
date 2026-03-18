import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle, Clock, History, Droplets, Flame, Trophy,
  Calendar, Edit2, X, Loader2, WifiOff, Sun, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { useAppContext } from "./Layout";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const HIGH_UV = 3;

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

function computePeakCoverage(
  peakHours: number[],
  appTimestamps: Date[],
  timerDurationSec: number
): { required: number; covered: number; slots: { label: string; covered: boolean }[] } {
  if (peakHours.length === 0) return { required: 0, covered: 0, slots: [] };
  const minPeak = Math.min(...peakHours);
  const maxPeak = Math.max(...peakHours);
  const slots: { label: string; covered: boolean }[] = [];
  for (let h = minPeak; h <= maxPeak; h += 2) {
    const slotEnd = Math.min(h + 2, maxPeak + 1);
    const label   = `${String(h).padStart(2, "0")}:00–${String(slotEnd).padStart(2, "0")}:00`;
    const covered = appTimestamps.some((ts) => {
      const appHour    = ts.getHours() + ts.getMinutes() / 60;
      const coverUntil = appHour + timerDurationSec / 3600;
      return coverUntil >= h && appHour < slotEnd;
    });
    slots.push({ label, covered });
  }
  return { required: slots.length, covered: slots.filter((s) => s.covered).length, slots };
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
async function apiAddLog(token: string, payload: { type: "Application" | "Alert"; message: string; duration_seconds?: number; uv_index_at_application?: number }): Promise<{ log: ProtectionLog; streak: StreakData | null }> {
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

  const [timerDuration, setTimerDuration]           = useState(() => loadLocal<number>(LS_TIMER_DURATION, 7200));
  const [showTimerEditModal, setShowTimerEditModal]  = useState(false);
  const [showTimeUpModal, setShowTimeUpModal]        = useState(false);
  const initialRemaining                             = getSecondsRemaining();
  const [timeRemaining, setTimeRemaining]            = useState<number>(initialRemaining ?? timerDuration);
  const [timerRunning, setTimerRunning]              = useState<boolean>(initialRemaining !== null && initialRemaining > 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [logs, setLogs]                   = useState<ProtectionLog[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastHighUVDate, setLastHighUV]   = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [offline, setOffline]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [streakBroken, setStreakBroken]   = useState(false);

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
        setLogs(fetchedLogs); setCurrentStreak(streakData.currentStreak); setLongestStreak(streakData.longestStreak);
        setLastHighUV(streakData.lastHighUVDate); setStreakBroken(streakData.streakBroken); setOffline(false);
        saveLocal(LS_LOGS_CACHE, fetchedLogs); saveLocal(LS_STREAK_CACHE, streakData);
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
        clearInterval(intervalRef.current!); stopTimer(); setTimerRunning(false); setTimeRemaining(timerDuration);
        addLog("Alert", "Timer complete — time to reapply!"); setShowTimeUpModal(true);
      } else { setTimeRemaining(rem); }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, timerDuration]);

  const addLog = useCallback(async (type: "Application" | "Alert", message: string, durationSeconds?: number, uvIndex?: number) => {
    const token = localStorage.getItem("sunguard_token");
    const tempLog: ProtectionLog = { id: `temp-${Date.now()}`, type, message, logged_at: new Date().toISOString(), duration_seconds: durationSeconds, uv_index_at_application: uvIndex };
    setLogs((prev) => [tempLog, ...prev]);
    if (!token || offline) return;
    setSaving(true);
    try {
      const { log: saved, streak } = await apiAddLog(token, { type, message, duration_seconds: durationSeconds, uv_index_at_application: uvIndex });
      setLogs((prev) => prev.map((l) => (l.id === tempLog.id ? saved : l)));
      if (streak) { setCurrentStreak(streak.currentStreak); setLongestStreak(streak.longestStreak); saveLocal(LS_STREAK_CACHE, streak); }
    } catch (err) { console.error("[addLog]", err); }
    finally { setSaving(false); }
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
        const open = copy[openIdx];
        const elapsed = Math.round(Math.min(stoppedAt - new Date(open.logged_at).getTime(), (open.duration_seconds || 7200) * 1000) / 1000);
        copy[openIdx] = { ...open, actual_duration_seconds: elapsed };
      }
      return copy;
    });
  };

  const updateTimerDuration = (seconds: number) => {
    setTimerDuration(seconds); stopTimer(); setTimerRunning(false); setTimeRemaining(seconds); setShowTimerEditModal(false);
  };

  // Derived
  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayApps = logs.filter((l) => l.type === "Application" && l.logged_at.slice(0, 10) === todayStr);
  const applicationsToday = todayApps.length;
  const minutesProtected  = todayApps.reduce((sum, l) => {
    if (l.actual_duration_seconds) return sum + l.actual_duration_seconds / 60;
    const timerStart = loadLocal<number | null>(LS_TIMER_START, null);
    if (timerRunning && timerStart) return sum + Math.round((Date.now() - timerStart) / 1000 / 60);
    return sum;
  }, 0);
  const hoursProtected = (minutesProtected / 60).toFixed(1);
  const peakHours     = hourlyForecast.filter((h) => h.uv >= HIGH_UV).map((h) => parseInt(h.time.split(":")[0], 10));
  const appTimestamps = todayApps.map((l) => new Date(l.logged_at)).sort((a, b) => a.getTime() - b.getTime());
  const peakCoverage  = computePeakCoverage(peakHours, appTimestamps, timerDuration);
  const allPeakSlotsCovered = peakCoverage.required > 0 ? peakCoverage.covered >= peakCoverage.required : true;

  const daysOfWeek   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today        = new Date();
  const dow          = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const weeklyData   = daysOfWeek.map((_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() + mondayOffset + i);
    const dayStr  = day.toISOString().slice(0, 10);
    const dayLogs = logs.filter((l) => l.type === "Application" && l.logged_at.slice(0, 10) === dayStr);
    return { hasAny: dayLogs.length > 0, hasHighUV: dayLogs.some((l) => (l.uv_index_at_application ?? 0) >= HIGH_UV), count: dayLogs.length };
  });
  const todayIndex = dow === 0 ? 6 : dow - 1;

  const hrs  = Math.floor(timeRemaining / 3600);
  const mins = Math.floor((timeRemaining % 3600) / 60);
  const secs = timeRemaining % 60;
  const timeDisplay    = timerRunning ? `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}` : "--:--:--";
  const timerProgress  = timerRunning ? timeRemaining / timerDuration : 1;
  const R = 48; const C = 2 * Math.PI * R;
  const strokeColor = timerRunning ? (timerProgress > 0.5 ? "#FF6900" : timerProgress > 0.25 ? "#ca8a04" : "#dc2626") : "#e5e7eb";

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const t = d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
    return d.toISOString().slice(0, 10) === todayStr ? t : d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + " " + t;
  };
  const fmtDuration = (s: number) => s >= 3600 ? `${(s/3600).toFixed(1).replace(".0","")}h ${Math.round((s%3600)/60)}m` : `${Math.round(s/60)}m`;

  return (
    <div className="flex flex-col gap-3">

      {/* Status banners — compact */}
      <div className="flex flex-col gap-2">
        {isHighUV ? (
          <div className="bg-[#fff7ed] border border-[#ff6900] rounded-lg px-4 py-2.5 flex items-center gap-2.5">
            <AlertTriangle size={15} className="text-[#FF6900] shrink-0" />
            <p className="text-[#7e2a0c] text-[13px] font-medium">
              UV {currentUV} ({uvLabel(currentUV)}) — <span className="font-semibold">High UV</span>. Apply SPF 50+ every 2 hrs during peak hours.
            </p>
          </div>
        ) : (
          <div className="bg-[#f0fdf4] border border-green-200 rounded-lg px-4 py-2.5 flex items-center gap-2.5">
            <Sun size={14} className="text-green-500 shrink-0" />
            <p className="text-green-700 text-[13px]">UV {currentUV} ({uvLabel(currentUV)}) — Low UV right now.</p>
          </div>
        )}
        {offline && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <WifiOff size={13} className="text-gray-400 shrink-0" />
            <p className="text-gray-500 text-[12px]">Offline — logs will sync when reconnected.</p>
          </div>
        )}
        {streakBroken && (
          <div className="bg-[#fff1f2] border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <Flame size={13} className="text-red-400 shrink-0" />
            <p className="text-red-600 text-[12px] font-medium">Streak reset — missed a peak-hour window yesterday. Start fresh today!</p>
          </div>
        )}
      </div>

      {/* ROW 1: Timer + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Timer card */}
        <div className="bg-white rounded-2xl border border-black/10 p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-[#0a0a0a] text-[14px] font-semibold flex items-center gap-1.5">
              <Clock size={15} className="text-[#FF6900]" /> Reapplication Timer
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[#9ca3af] text-[12px]">
                {timerDuration >= 3600 ? `${timerDuration / 3600}hr` : `${timerDuration / 60}min`}
              </span>
              <button
                onClick={() => setShowTimerEditModal(true)}
                className="text-[#6a7282] hover:text-[#101828] flex items-center gap-1 text-[12px] font-medium bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors border border-black/5 cursor-pointer"
              >
                <Edit2 size={11} /> Edit
              </button>
            </div>
          </div>

          {/* Timer ring + status */}
          <div className="flex items-center gap-4">
            <div className="relative w-[108px] h-[108px] shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 108 108">
                <circle cx="54" cy="54" r={R} fill="none" stroke="#f3f4f6" strokeWidth="7" />
                <circle cx="54" cy="54" r={R} fill="none" stroke={strokeColor} strokeWidth="7"
                  strokeLinecap="round" strokeDasharray={C}
                  strokeDashoffset={C * (1 - timerProgress)}
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 1s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock size={13} className={timerRunning ? "text-[#FF6900] mb-0.5" : "text-gray-300 mb-0.5"} />
                <span className="text-[#101828] text-[18px] font-bold tracking-wide leading-none">
                  {timerRunning ? `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}` : "--:--"}
                </span>
                {timerRunning && <span className="text-[#9ca3af] text-[10px] mt-0.5">{String(secs).padStart(2,"0")}s</span>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <p className="text-[#6a7282] text-[12px] leading-snug">
                {timerRunning ? `Reapply in ${timeDisplay}` : "Apply sunscreen to start the timer"}
              </p>
              {timerRunning && (
                <div className="flex items-center gap-1.5 text-[12px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                  <span className="text-[#16a34a] font-medium">Protected now</span>
                  {isHighUV && (
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full ml-auto"
                      style={{ background: uvColor(currentUV) + "20", color: uvColor(currentUV) }}>
                      UV {currentUV}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={recordApplication}
              className="w-full bg-[#FF6900] hover:bg-[#E55E00] text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Droplets size={17} />}
              <span className="text-[14px] font-semibold">{saving ? "Saving..." : "I Applied Sunscreen"}</span>
            </button>
            {timerRunning && (
              <button
                onClick={stopTimerManually}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl px-4 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <ShieldCheck size={14} /> <span className="text-[13px] font-medium">Stop Protection Window</span>
              </button>
            )}
          </div>
        </div>

        {/* Streak card */}
        <div className="bg-white rounded-2xl border border-black/10 p-4 flex flex-col gap-3">
          <h3 className="text-[#0a0a0a] text-[14px] font-semibold flex items-center gap-1.5">
            <Trophy size={15} className="text-[#FF6900]" /> Protection Streak
          </h3>

          {/* Stats row */}
          {loading ? (
            <div className="w-full h-16 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 bg-gradient-to-br from-[#fff7ed] to-[#ffe4c4] border border-[#ffcf99] flex flex-col items-center justify-center">
                <span className="text-[26px] font-extrabold text-[#101828] leading-none">{applicationsToday}</span>
                <span className="text-[#9f2d00] text-[10px] font-semibold mt-0.5">Applied today</span>
              </div>
              <div className="rounded-xl p-3 bg-gradient-to-br from-[#faf5ff] to-[#ede9fe] border border-[#c4b5fd] flex flex-col items-center justify-center">
                <span className="text-[26px] font-extrabold text-[#101828] leading-none">{currentStreak}</span>
                <span className="text-[#5b21b6] text-[10px] font-semibold mt-0.5">Day streak</span>
              </div>
              <div className="rounded-xl p-3 bg-gray-50 border border-black/5 flex flex-col items-center justify-center">
                <span className="text-[26px] font-extrabold text-[#101828] leading-none">{longestStreak}</span>
                <span className="text-[#6a7282] text-[10px] font-semibold mt-0.5">Best streak</span>
              </div>
            </div>
          )}

          {/* Peak coverage */}
          {peakCoverage.required > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[#4a5565] text-[12px] font-medium">Peak-hour coverage</p>
                <span className={`text-[12px] font-bold ${allPeakSlotsCovered ? "text-green-600" : "text-[#FF6900]"}`}>
                  {peakCoverage.covered}/{peakCoverage.required}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(peakCoverage.covered / peakCoverage.required) * 100}%`, background: allPeakSlotsCovered ? "#16a34a" : "#FF6900" }} />
              </div>
              <div className="flex flex-wrap gap-1">
                {peakCoverage.slots.map((slot, i) => (
                  <div key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    slot.covered ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700"
                  }`}>
                    {slot.covered ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                    {slot.label}
                  </div>
                ))}
              </div>
              {allPeakSlotsCovered && (
                <p className="text-green-600 text-[11px] font-semibold mt-1.5 flex items-center gap-1">
                  <CheckCircle2 size={11} /> All windows covered — streak safe! 🎉
                </p>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <p className="text-green-700 text-[12px]">No peak UV today — streak is safe automatically.</p>
            </div>
          )}

          {/* How streaks work — collapsed */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-black/5">
            <p className="text-[#6a7282] text-[11px] leading-snug">
              <span className="font-semibold text-[#4a5565]">How streaks work: </span>
              Apply in every 2-hr peak UV window (UV ≥ 3) to keep your streak alive.
            </p>
          </div>

          {/* Weekly grid */}
          <div>
            <p className="text-[#4a5565] text-[12px] font-semibold mb-1.5">This Week</p>
            <div className="flex justify-between items-end gap-1">
              {daysOfWeek.map((day, i) => {
                const { hasAny, hasHighUV, count } = weeklyData[i];
                const isToday = i === todayIndex;
                return (
                  <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
                    {count > 0 && (
                      <span className="text-[9px] font-bold" style={{ color: hasHighUV ? "#FF6900" : "#16a34a" }}>{count}×</span>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      hasHighUV ? "bg-[#fff7ed] border-2 border-[#FF6900] shadow-sm"
                      : hasAny   ? "bg-[#f0fdf4] border-2 border-[#16a34a]"
                      : isToday  ? "bg-white border-2 border-dashed border-[#FF6900]"
                      : "bg-gray-50 border border-gray-200"
                    }`}>
                      <Flame size={14} className={hasHighUV ? "text-[#FF6900]" : hasAny ? "text-[#16a34a]" : "text-gray-300"}
                        fill={hasHighUV ? "#FF6900" : hasAny ? "#16a34a" : "transparent"} />
                    </div>
                    <span className={`text-[10px] ${
                      isToday ? "font-bold text-[#FF6900]" : hasAny ? "font-semibold text-[#101828]" : "text-gray-400"
                    }`}>{day}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1"><Flame size={10} fill="#FF6900" className="text-[#FF6900]" /><span className="text-[10px] text-[#6a7282]">Peak UV</span></div>
              <div className="flex items-center gap-1"><Flame size={10} fill="#16a34a" className="text-[#16a34a]" /><span className="text-[10px] text-[#6a7282]">No peak</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Stats + Activity Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

        {/* Today's stats */}
        <div className="bg-white rounded-2xl border border-black/10 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Calendar size={15} className="text-[#4a5565]" />
            <h3 className="text-[#0a0a0a] text-[14px] font-semibold">Today&apos;s Stats</h3>
          </div>
          <div className="flex flex-col gap-2">
            <div className="bg-[#f0fdf4] rounded-xl py-3 px-4 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[11px] mb-0.5">Times Applied</p>
                {loading ? <div className="h-6 w-8 bg-gray-100 rounded animate-pulse" /> :
                  <p className="text-[#166534] text-[22px] font-bold leading-none">{applicationsToday}</p>}
              </div>
              <Droplets size={22} className="text-[#16a34a] opacity-30" />
            </div>
            <div className="bg-[#eff6ff] rounded-xl py-3 px-4 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[11px] mb-0.5">Time Protected</p>
                {loading ? <div className="h-6 w-14 bg-gray-100 rounded animate-pulse" /> :
                  <p className="text-[#1d4ed8] text-[22px] font-bold leading-none">{hoursProtected}h</p>}
                <p className="text-[#9ca3af] text-[10px] mt-0.5">Actual coverage</p>
              </div>
              <Clock size={22} className="text-[#3b82f6] opacity-30" />
            </div>
            <div className="bg-gray-50 rounded-xl py-3 px-4 flex items-center justify-between border border-black/5">
              <div>
                <p className="text-[#4a5565] text-[11px] mb-0.5">Current UV</p>
                <p className="font-bold text-[16px]" style={{ color: uvColor(currentUV) }}>
                  {currentUV} <span className="text-[12px]">{uvLabel(currentUV)}</span>
                </p>
              </div>
              <Sun size={22} style={{ color: uvColor(currentUV) }} className="opacity-50" />
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-2xl border border-black/10 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <History size={15} className="text-[#4a5565]" />
              <h3 className="text-[#0a0a0a] text-[14px] font-semibold">Activity Log</h3>
            </div>
            {logs.length > 0 && !loading && (
              <button onClick={async () => {
                if (!window.confirm("Clear all logs? This cannot be undone.")) return;
                const token = localStorage.getItem("sunguard_token");
                if (token) await apiClearLogs(token).catch(() => null);
                setLogs([]); saveLocal(LS_LOGS_CACHE, []);
              }} className="text-[11px] text-[#6a7282] hover:text-red-500 transition-colors cursor-pointer">Clear</button>
            )}
          </div>
          <div className="overflow-y-auto min-h-[120px] max-h-[280px]">
            {loading ? (
              <div className="flex flex-col gap-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}</div>
            ) : logs.length === 0 ? (
              <p className="text-[#717182] text-[13px] text-center py-8">No activity yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {logs.map((log) => {
                  const uvVal = log.uv_index_at_application;
                  const isApp = log.type === "Application";
                  return (
                    <div key={log.id} className={`rounded-lg px-3 py-2 border ${
                      log.type === "Alert" ? "bg-[#fff7ed] border-[#ffedd4]" : "bg-[#fafafa] border-black/5"
                    }`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-[12px] font-medium leading-tight ${
                          log.type === "Alert" ? "text-[#9f2d00]" : "text-[#101828]"
                        }`}>{log.message}</p>
                        <span className="text-[#9ca3af] text-[10px] whitespace-nowrap shrink-0">{formatDate(log.logged_at)}</span>
                      </div>
                      {isApp && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {log.actual_duration_seconds ? (
                            <span className="text-[10px] text-[#16a34a] font-medium flex items-center gap-0.5">
                              <ShieldCheck size={10} /> {fmtDuration(log.actual_duration_seconds)}
                            </span>
                          ) : timerRunning ? (
                            <span className="text-[10px] text-[#FF6900] font-medium flex items-center gap-0.5">
                              <Clock size={10} className="animate-pulse" /> Active
                            </span>
                          ) : null}
                          {uvVal !== undefined && uvVal !== null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
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
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 relative shadow-xl">
            <button onClick={() => setShowTimerEditModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
            <h3 className="text-[16px] font-bold mb-0.5">Set Timer Duration</h3>
            <p className="text-[#6a7282] text-[12px] mb-4">Changing duration resets the current timer.</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "30 min — Swimming / Heavy Sweating", value: 1800 },
                { label: "1 hour — Outdoor Activity",         value: 3600 },
                { label: "2 hours — Daily Wear",              value: 7200 },
              ].map(({ label, value }) => (
                <button key={value} onClick={() => updateTimerDuration(value)}
                  className={`px-4 py-2.5 rounded-xl border text-left font-medium text-[13px] transition-colors cursor-pointer ${
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
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl text-center">
            <div className="w-12 h-12 bg-[#fff7ed] rounded-full flex items-center justify-center mx-auto mb-3">
              <Droplets size={24} className="text-[#FF6900]" />
            </div>
            <h2 className="text-[18px] font-bold mb-1">Time to Reapply!</h2>
            {isHighUV && (
              <p className="text-[12px] font-semibold mb-1" style={{ color: uvColor(currentUV) }}>
                UV {currentUV} — {uvLabel(currentUV)} right now
              </p>
            )}
            <p className="text-gray-500 mb-4 text-[13px]">Protection window expired. Apply SPF 50+ to protect your streak.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setShowTimeUpModal(false); recordApplication(); }}
                className="w-full bg-[#FF6900] hover:bg-[#E55E00] text-white py-2.5 rounded-xl font-bold text-[14px] cursor-pointer">
                I Applied It!
              </button>
              <button onClick={() => setShowTimeUpModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-[14px] cursor-pointer">
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
