import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle, Play, Square, Clock, History,
  Droplets, Flame, Trophy, Calendar, Edit2, X, Loader2, WifiOff,
} from "lucide-react";
import { useAppContext } from "./Layout";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProtectionLog {
  id: string;
  message: string;
  logged_at: string;
  type: "Application" | "Alert";
  duration_seconds?: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastAppliedDate: string | null;
  streakBroken: boolean;
}

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------
const LS_TIMER_START    = "sunguard_timer_start";    // ms timestamp when timer started
const LS_TIMER_DURATION = "sunguard_timer_duration"; // seconds
const LS_LOGS_CACHE     = "sunguard_logs_cache";
const LS_STREAK_CACHE   = "sunguard_streak_cache";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function saveLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Timer helpers — always derived from wall-clock, never from React countdown
// ---------------------------------------------------------------------------

/** Returns seconds remaining, or null if no timer is running. */
function getSecondsRemaining(): number | null {
  const start    = loadLocal<number | null>(LS_TIMER_START, null);
  const duration = loadLocal<number>(LS_TIMER_DURATION, 7200);
  if (start === null) return null;
  const elapsed = Math.floor((Date.now() - start) / 1000);
  const remaining = duration - elapsed;
  return remaining > 0 ? remaining : 0;
}

/** Start the timer — stores the current timestamp. */
function startTimer() {
  saveLocal(LS_TIMER_START, Date.now());
}

/** Stop the timer — removes the stored timestamp. */
function stopTimer() {
  localStorage.removeItem(LS_TIMER_START);
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiFetchLogs(token: string): Promise<ProtectionLog[]> {
  const res = await fetch(`${backendUrl}/logs?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

async function apiAddLog(
  token: string,
  payload: { type: "Application" | "Alert"; message: string; duration_seconds?: number }
): Promise<{ log: ProtectionLog; streak: StreakData | null }> {
  const res = await fetch(`${backendUrl}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save log");
  return res.json();
}

async function apiClearLogs(token: string): Promise<void> {
  const res = await fetch(`${backendUrl}/logs`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to clear logs");
}

async function apiFetchStreak(token: string): Promise<StreakData> {
  const res = await fetch(`${backendUrl}/logs/streak`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch streak");
  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RemindersPage() {
  const { uvData } = useAppContext();
  const { currentUV } = uvData;

  // Timer config (duration preference only — NOT a countdown)
  const [timerDuration, setTimerDuration]     = useState(() => loadLocal<number>(LS_TIMER_DURATION, 7200));
  const [showTimerEditModal, setShowTimerEditModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal]       = useState(false);

  // timeRemaining is always recomputed from wall-clock, never stored as state between renders
  const initialRemaining = getSecondsRemaining();
  const [timeRemaining, setTimeRemaining] = useState<number>(initialRemaining ?? timerDuration);
  const [timerRunning, setTimerRunning]   = useState<boolean>(initialRemaining !== null && initialRemaining > 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DB-backed state
  const [logs, setLogs]                   = useState<ProtectionLog[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [lastAppliedDate, setLastApplied] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [saving, setSaving]   = useState(false);

  // ---------------------------------------------------------------------------
  // On mount: restore timer from wall-clock and fetch DB data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Restore timer state from absolute timestamp
    const remaining = getSecondsRemaining();
    if (remaining !== null && remaining > 0) {
      setTimeRemaining(remaining);
      setTimerRunning(true);
    } else if (remaining === 0) {
      // Timer already expired while the page was closed — fire the alert
      stopTimer();
      setTimerRunning(false);
      setTimeRemaining(timerDuration);
      setShowTimeUpModal(true);
    }

    // Fetch logs + streak from DB
    const token = localStorage.getItem("sunguard_token");
    if (!token) { setLoading(false); return; }

    Promise.all([apiFetchLogs(token), apiFetchStreak(token)])
      .then(([fetchedLogs, streakData]) => {
        setLogs(fetchedLogs);
        setCurrentStreak(streakData.currentStreak);
        setLongestStreak(streakData.longestStreak);
        setLastApplied(streakData.lastAppliedDate);
        setOffline(false);
        saveLocal(LS_LOGS_CACHE, fetchedLogs);
        saveLocal(LS_STREAK_CACHE, streakData);
      })
      .catch(() => {
        setOffline(true);
        const cachedLogs   = loadLocal<ProtectionLog[]>(LS_LOGS_CACHE, []);
        const cachedStreak = loadLocal<StreakData>(LS_STREAK_CACHE, {
          currentStreak: 0, longestStreak: 0, lastAppliedDate: null, streakBroken: false,
        });
        setLogs(cachedLogs);
        setCurrentStreak(cachedStreak.currentStreak);
        setLongestStreak(cachedStreak.longestStreak);
        setLastApplied(cachedStreak.lastAppliedDate);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist duration preference
  useEffect(() => { saveLocal(LS_TIMER_DURATION, timerDuration); }, [timerDuration]);

  // ---------------------------------------------------------------------------
  // Tick: recompute remaining from wall-clock every second (not by decrementing)
  // This means the timer is always accurate regardless of tab focus / sleep.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const remaining = getSecondsRemaining();
      if (remaining === null || remaining <= 0) {
        clearInterval(intervalRef.current!);
        stopTimer();
        setTimerRunning(false);
        setTimeRemaining(timerDuration);
        addLog("Alert", "Timer complete — time to reapply!");
        setShowTimeUpModal(true);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // addLog is stable via useCallback; timerDuration only changes on user action
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, timerDuration]);

  // ---------------------------------------------------------------------------
  // Add log — saves to DB with optimistic update
  // ---------------------------------------------------------------------------
  const addLog = useCallback(
    async (type: "Application" | "Alert", message: string, durationSeconds?: number) => {
      const token = localStorage.getItem("sunguard_token");
      const tempLog: ProtectionLog = {
        id: `temp-${Date.now()}`,
        type,
        message,
        logged_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      };
      setLogs((prev) => [tempLog, ...prev]);
      if (!token || offline) return;
      setSaving(true);
      try {
        const { log: savedLog, streak } = await apiAddLog(token, { type, message, duration_seconds: durationSeconds });
        setLogs((prev) => prev.map((l) => (l.id === tempLog.id ? savedLog : l)));
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
    },
    [offline]
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Record a sunscreen application: log it to DB and start/restart the timer. */
  const recordApplication = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
    addLog("Application", `Applied sunscreen at ${timeStr}`, timerDuration);
    startTimer();  // stores Date.now() — wall-clock anchor
    setTimerRunning(true);
    setTimeRemaining(timerDuration);
  };

  /** Stop the timer manually without recording a new application. */
  const stopTimerManually = () => {
    stopTimer();
    setTimerRunning(false);
    setTimeRemaining(timerDuration);
  };

  /** Start the timer without recording a new application log. */
  const startTimerManually = () => {
    startTimer();
    setTimerRunning(true);
    setTimeRemaining(timerDuration);
  };

  const updateTimerDuration = (seconds: number) => {
    setTimerDuration(seconds);
    stopTimer();  // clear existing anchor — user must re-apply to restart
    setTimerRunning(false);
    setTimeRemaining(seconds);
    setShowTimerEditModal(false);
  };

  // ---------------------------------------------------------------------------
  // Derived stats
  // ---------------------------------------------------------------------------
  const todayStr = new Date().toISOString().slice(0, 10);
  const applicationsTodayLogs = logs.filter(
    (l) => l.type === "Application" && l.logged_at.slice(0, 10) === todayStr
  );
  const applicationsToday = applicationsTodayLogs.length;
  const hoursProtected = applicationsTodayLogs
    .reduce((t, l) => t + (l.duration_seconds || 7200) / 3600, 0)
    .toFixed(1);

  const streakBroken = (() => {
    if (!lastAppliedDate) return false;
    const diff = Math.round((new Date(todayStr).getTime() - new Date(lastAppliedDate).getTime()) / 86400000);
    return diff > 1 && currentStreak === 0;
  })();

  // ---------------------------------------------------------------------------
  // Weekly progress grid
  // ---------------------------------------------------------------------------
  const daysOfWeek    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today         = new Date();
  const dayOfWeek     = today.getDay();
  const mondayOffset  = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weeklyProgress = daysOfWeek.map((_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() + mondayOffset + i);
    const dayStr = day.toISOString().slice(0, 10);
    return logs.some((l) => l.type === "Application" && l.logged_at.slice(0, 10) === dayStr);
  });
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Timer display
  const hrs  = Math.floor(timeRemaining / 3600);
  const mins = Math.floor((timeRemaining % 3600) / 60);
  const secs = timeRemaining % 60;
  const timeDisplay = timerRunning
    ? `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : "--:--:--";

  // Progress ring: proportion of time elapsed
  const timerProgress = timerRunning ? timeRemaining / timerDuration : 1;
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - timerProgress);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const isToday = d.toISOString().slice(0, 10) === todayStr;
    const timeStr = d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (isToday) return timeStr;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + " " + timeStr;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">

      {currentUV >= 6 && (
        <div className="bg-[#fff7ed] border border-[#ff6900] rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#0a0a0a] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#7e2a0c] text-[14px] font-medium">High UV Alert Active</p>
            <p className="text-[#9f2d00] text-[14px]">Current UV is {currentUV}. Ensure you've applied SPF 50+ and seek shade.</p>
          </div>
        </div>
      )}

      {offline && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <WifiOff size={16} className="text-gray-400 shrink-0" />
          <p className="text-gray-500 text-[13px]">You're offline — activity logs will sync when you reconnect.</p>
        </div>
      )}

      {streakBroken && (
        <div className="bg-[#fff1f2] border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Flame size={16} className="text-red-400 shrink-0" />
          <p className="text-red-600 text-[13px] font-medium">
            Your streak was reset — you missed applying sunscreen yesterday. Start a new streak today!
          </p>
        </div>
      )}

      {/* Streak Tracking */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-between">
          <div className="flex flex-col items-center lg:items-start w-full lg:w-1/3">
            <h3 className="text-[#0a0a0a] text-[18px] font-semibold mb-6 flex items-center gap-2">
              <Trophy size={20} className="text-[#FF6900]" /> Protection Streak
            </h3>
            {loading ? (
              <div className="w-full h-20 bg-gray-50 rounded-2xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-5 bg-gradient-to-br from-[#ffedd4] to-[#ffe4c4] border border-[#ffcf99] rounded-2xl p-5 w-full">
                <div className="flex shrink-0 items-center justify-center w-[60px] h-[60px] bg-white rounded-full shadow-sm">
                  <Flame size={32} className="text-[#FF6900]" fill="#FF6900" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[32px] font-extrabold leading-tight text-[#101828]">{currentStreak}</span>
                    <span className="text-[#9f2d00] text-[14px] font-bold">Days</span>
                  </div>
                  <span className="text-[#9f2d00] text-[13px] font-medium">Current Streak</span>
                </div>
              </div>
            )}
            <p className="text-[#6a7282] text-[13px] mt-4 flex items-center gap-1.5">
              <Trophy size={14} /> Longest streak: <span className="font-bold text-[#101828] ml-1">{longestStreak} days</span>
            </p>
          </div>

          <div className="flex-1 w-full flex flex-col justify-center">
            <p className="text-[#4a5565] text-[14px] mb-5 font-semibold text-center lg:text-left">This Week's Consistency</p>
            <div className="flex justify-between items-end gap-2 sm:gap-3 w-full max-w-2xl mx-auto lg:mx-0">
              {daysOfWeek.map((day, i) => {
                const isActive = weeklyProgress[i];
                const isToday  = i === todayIndex;
                return (
                  <div key={day} className="flex flex-col items-center gap-3 flex-1">
                    <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all ${
                      isActive ? "bg-[#fff7ed] border-2 border-[#FF6900] shadow-sm scale-110"
                      : isToday ? "bg-white border-2 border-dashed border-[#FF6900]"
                      : "bg-gray-50 border border-gray-200"
                    }`}>
                      <Flame size={20} className={isActive ? "text-[#FF6900]" : "text-gray-300"} fill={isActive ? "#FF6900" : "transparent"} />
                    </div>
                    <span className={`text-[11px] sm:text-[13px] ${
                      isToday ? "font-bold text-[#FF6900]" : isActive ? "font-semibold text-[#101828]" : "text-gray-400"
                    }`}>{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reapplication Timer */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[#0a0a0a] text-[16px] font-medium">Reapplication Timer</h3>
          <button onClick={() => setShowTimerEditModal(true)}
            className="text-[#6a7282] hover:text-[#101828] flex items-center gap-1.5 text-[13px] font-medium bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-black/5">
            <Edit2 size={14} /> Edit Time
          </button>
        </div>
        <p className="text-[#717182] text-[14px] mb-6">
          Counts down from {timerDuration >= 3600 ? `${timerDuration / 3600}hr` : `${timerDuration / 60}min`} — continues across page navigations and refreshes
        </p>

        {/* Timer ring + countdown */}
        <div className="flex flex-col items-center gap-6 mb-6">
          <div className="relative w-[140px] h-[140px]">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              {/* Background ring */}
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth="8" />
              {/* Progress ring */}
              <circle
                cx="60" cy="60" r={RADIUS}
                fill="none"
                stroke={timerRunning ? (timerProgress > 0.5 ? "#FF6900" : timerProgress > 0.2 ? "#F0B100" : "#FB2C36") : "#e5e7eb"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.9s linear, stroke 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Clock size={18} className={timerRunning ? "text-[#FF6900] mb-1" : "text-gray-300 mb-1"} />
              <span className="text-[#101828] text-[22px] font-bold tracking-wider leading-none">
                {timerRunning
                  ? `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}`
                  : "--:--"}
              </span>
              {timerRunning && (
                <span className="text-[#6a7282] text-[12px] mt-0.5">{String(secs).padStart(2,"0")}s</span>
              )}
            </div>
          </div>

          <p className="text-[#6a7282] text-[14px] text-center">
            {timerRunning ? "Next reapplication due in" : "Start the timer after applying sunscreen"}
          </p>
          <p className="text-[#101828] text-[28px] font-bold tracking-wider">{timeDisplay}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          <button onClick={recordApplication}
            className="w-full bg-[#FF6900] hover:bg-[#E55E00] text-white rounded-xl px-5 py-4 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Droplets size={20} />}
            <span className="text-[15px] font-semibold">{saving ? "Saving..." : "I Applied Sunscreen — Start Timer"}</span>
          </button>

          {timerRunning ? (
            <button onClick={stopTimerManually}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-5 py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <Square size={16} /> <span className="text-[14px] font-medium">Stop Timer</span>
            </button>
          ) : (
            <button onClick={startTimerManually}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-5 py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <Play size={16} /> <span className="text-[14px] font-medium">Resume Timer (without logging)</span>
            </button>
          )}
        </div>
      </div>

      {/* Today's Stats & Activity Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-black/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-[#4a5565]" />
            <h3 className="text-[#0a0a0a] text-[16px] font-medium">Today's Stats</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-[#f0fdf4] rounded-xl py-4 px-5 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[13px] mb-1">Applications Today</p>
                {loading ? <div className="h-8 w-12 bg-gray-100 rounded animate-pulse mt-1" /> :
                  <p className="text-[#166534] text-[24px] font-bold">{applicationsToday}</p>}
              </div>
              <Droplets size={28} className="text-[#16a34a] opacity-50" />
            </div>
            <div className="bg-[#eff6ff] rounded-xl py-4 px-5 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[13px] mb-1">Hours Protected (Est.)</p>
                {loading ? <div className="h-8 w-12 bg-gray-100 rounded animate-pulse mt-1" /> :
                  <p className="text-[#1d4ed8] text-[24px] font-bold">{hoursProtected}h</p>}
              </div>
              <Clock size={28} className="text-[#3b82f6] opacity-50" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-[#4a5565]" />
              <h3 className="text-[#0a0a0a] text-[16px] font-medium">Recent Activity</h3>
            </div>
            {logs.length > 0 && !loading && (
              <button
                onClick={async () => {
                  if (!window.confirm("Clear all activity logs? This cannot be undone.")) return;
                  const token = localStorage.getItem("sunguard_token");
                  if (token) await apiClearLogs(token).catch(() => null);
                  setLogs([]);
                  saveLocal(LS_LOGS_CACHE, []);
                }}
                className="text-[12px] text-[#6a7282] hover:text-red-500 transition-colors">Clear all</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-[150px] max-h-[320px]">
            {loading ? (
              <div className="flex flex-col gap-3 mt-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-[#717182] text-[14px] text-center py-8">No activity yet. Record your first application!</p>
            ) : (
              <div className="flex flex-col gap-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="hidden sm:flex flex-col items-center mt-2">
                      <div className={`w-2 h-2 rounded-full ${
                        log.type === "Application" ? "bg-[#16a34a]" : "bg-[#FF6900]"
                      }`} />
                    </div>
                    <div className={`flex-1 rounded-xl px-4 py-3 ${
                      log.type === "Alert" ? "bg-[#fff7ed] border border-[#ffedd4]" : "bg-[#fafafa] border border-black/5"
                    }`}>
                      <div className="flex justify-between items-start">
                        <p className={`text-[14px] font-medium leading-tight ${
                          log.type === "Alert" ? "text-[#9f2d00]" : "text-[#101828]"
                        }`}>{log.message}</p>
                        <span className="text-[#6a7282] text-[12px] whitespace-nowrap ml-2">{formatDate(log.logged_at)}</span>
                      </div>
                      {log.duration_seconds && log.type === "Application" && (
                        <p className="text-[#6a7282] text-[12px] mt-0.5">
                          Timer set for {log.duration_seconds >= 3600 ? `${log.duration_seconds / 3600}hr` : `${log.duration_seconds / 60}min`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Timer Modal */}
      {showTimerEditModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-xl">
            <button onClick={() => setShowTimerEditModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20} /></button>
            <h3 className="text-[18px] font-bold mb-2">Set Timer Duration</h3>
            <p className="text-[#6a7282] text-[14px] mb-5">Changing duration will reset the current timer.</p>
            <div className="flex flex-col gap-3">
              {[
                { label: "30 Minutes — High Sweating / Swimming", value: 1800 },
                { label: "1 Hour — Standard Outdoor Activity",    value: 3600 },
                { label: "2 Hours — General Daily Wear",          value: 7200 },
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
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-xl text-center">
            <div className="w-16 h-16 bg-[#fff7ed] rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets size={32} className="text-[#FF6900]" />
            </div>
            <h2 className="text-[22px] font-bold mb-2">Time to Reapply!</h2>
            <p className="text-gray-600 mb-6 text-[15px]">Your sunscreen protection window has expired. Apply SPF 50+ now to stay protected.</p>
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
