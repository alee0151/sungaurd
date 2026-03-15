import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle,
  Play,
  Square,
  Clock,
  History,
  Droplets,
  Flame,
  Trophy,
  Calendar,
  Edit2,
  X,
} from "lucide-react";
import { useAppContext } from "./Layout";

interface ProtectionLog {
  id: string;
  message: string;
  timestamp: Date;
  type: "Application" | "Alert";
  durationSeconds?: number;
}

export default function RemindersPage() {
  const { uvData } = useAppContext();
  const { currentUV } = uvData;

  //测试用
  const [reminderData, setReminderData] = useState<any>(null);

useEffect(() => {
  const fetchReminderData = async () => {
    try {
      const response = await fetch("http://localhost:3000/reminders");
      const data = await response.json();
      setReminderData(data);
      console.log("Reminder data:", data);
    } catch (error) {
      console.error("Failed to fetch reminder data:", error);
    }
  };

  fetchReminderData();
}, []);

//******** */
  // Timer configuration state
  const [timerDuration, setTimerDuration] = useState(2 * 60 * 60); // Default 2 hours
  const [showTimerEditModal, setShowTimerEditModal] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timerDuration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stats and Logs state
  const [logs, setLogs] = useState<ProtectionLog[]>([
    {
      id: "2",
      message: "High UV Alert! Seek shade.",
      timestamp: new Date(new Date().getTime() - 4000000), // ~1 hr ago
      type: "Alert",
    },
    {
      id: "1",
      message: "Applied SPF 50+",
      timestamp: new Date(new Date().getTime() - 7200000), // ~2 hrs ago
      type: "Application",
      durationSeconds: 7200
    }
  ]);

  const [currentStreak, setCurrentStreak] = useState(5);
  const longestStreak = 12;

  // Derived Stats
  const applicationsTodayLogs = logs.filter(
    (l) =>
      l.type === "Application" &&
      l.timestamp.toDateString() === new Date().toDateString()
  );
  
  const applicationsToday = applicationsTodayLogs.length;

  // Accurately calculate hours protected based on actual duration of each application
  const hoursProtected = applicationsTodayLogs.reduce((total, log) => {
    return total + (log.durationSeconds || 7200) / 3600;
  }, 0).toFixed(1);

  const addLog = useCallback((message: string, type: ProtectionLog["type"], durationSeconds?: number) => {
    setLogs((prev) => [
      {
        id: Date.now().toString(),
        message,
        timestamp: new Date(),
        type,
        durationSeconds
      },
      ...prev,
    ]);
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            addLog("Timer Complete: Time to reapply!", "Alert");
            setShowTimeUpModal(true);
            return timerDuration; // Reset to configured duration
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timeRemaining, timerDuration, addLog]);

  const toggleTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      setTimeRemaining(timerDuration);
    } else {
      setTimerRunning(true);
    }
  };

  const recordApplication = () => {
    addLog("Applied sunscreen", "Application", timerDuration);
    if (applicationsToday === 0) {
      setCurrentStreak((prev) => prev + 1);
    }
    setTimerRunning(true);
    setTimeRemaining(timerDuration);
  };

  const updateTimerDuration = (seconds: number) => {
    setTimerDuration(seconds);
    setTimeRemaining(seconds);
    setTimerRunning(false); // Stop timer when updating duration
    setShowTimerEditModal(false);
  };

  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = timerRunning
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`
    : "--:--:--";

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Mock array: true means applied that day. index 4 is 'Fri' (today for this mock).
  const mockWeeklyProgress = [true, true, true, true, applicationsToday > 0, false, false];

  return (
    <div className="flex flex-col gap-6">
      {/* High UV Alert */}
      {currentUV >= 6 && (
        <div className="bg-[#fff7ed] border border-[#ff6900] rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#0a0a0a] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#7e2a0c] text-[14px]" style={{ fontWeight: 500 }}>
              High UV Alert Active
            </p>
            <p className="text-[#9f2d00] text-[14px]">
              Current UV index is {currentUV}. Ensure you've applied SPF 50+ and stay in the shade.
            </p>
          </div>
        </div>
      )}

      {/* Redesigned Streak Tracking */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-between">
          {/* Current Streak Summary */}
          <div className="flex flex-col items-center lg:items-start w-full lg:w-1/3">
            <h3 className="text-[#0a0a0a] text-[18px] font-semibold mb-6 flex items-center gap-2">
              <Trophy size={20} className="text-[#FF6900]" />
              Protection Streak
            </h3>
            
            <div className="flex items-center gap-5 bg-gradient-to-br from-[#ffedd4] to-[#ffe4c4] border border-[#ffcf99] rounded-2xl p-5 w-full">
              <div className="relative flex shrink-0 items-center justify-center w-[60px] h-[60px] bg-white rounded-full shadow-sm">
                 <Flame size={32} className="text-[#FF6900]" fill="#FF6900" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="block text-[32px] font-extrabold leading-tight text-[#101828]">{currentStreak}</span>
                  <span className="text-[#9f2d00] text-[14px] font-bold">Days</span>
                </div>
                <span className="text-[#9f2d00] text-[13px] font-medium leading-none">Current Streak</span>
              </div>
            </div>
            
            <p className="text-[#6a7282] text-[13px] mt-4 flex items-center gap-1.5">
              <Trophy size={14} /> Longest streak: <span className="font-bold text-[#101828]">{longestStreak} days</span>
            </p>
          </div>

          {/* This Week's Consistency */}
          <div className="flex-1 w-full flex flex-col justify-center mt-2 lg:mt-0">
            <p className="text-[#4a5565] text-[14px] mb-5 font-semibold text-center lg:text-left">
              This Week's Consistency
            </p>
            <div className="flex justify-between items-end gap-2 sm:gap-3 w-full max-w-2xl mx-auto lg:mx-0">
              {daysOfWeek.map((day, i) => {
                const isActive = mockWeeklyProgress[i];
                const isToday = i === 4; 
                
                return (
                  <div key={day} className="flex flex-col items-center gap-3 flex-1 relative">
                    <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all z-10 relative
                      ${isActive 
                        ? "bg-[#fff7ed] border-2 border-[#FF6900] shadow-sm scale-110" 
                        : isToday 
                          ? "bg-white border-2 border-dashed border-[#FF6900]"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      {isActive ? (
                        <Flame size={20} className="text-[#FF6900] sm:w-[28px] sm:h-[28px]" fill="#FF6900" />
                      ) : (
                        <Flame size={20} className="text-gray-300 sm:w-[24px] sm:h-[24px]" />
                      )}
                    </div>
                    <span className={`text-[11px] sm:text-[13px] ${isToday ? "font-bold text-[#FF6900]" : isActive ? "font-semibold text-[#101828]" : "text-gray-400"}`}>
                      {day}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sunscreen Timer & Quick Action */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
            Reapplication Timer
          </h3>
          <button 
            onClick={() => setShowTimerEditModal(true)}
            className="text-[#6a7282] hover:text-[#101828] flex items-center gap-1.5 text-[13px] font-medium bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-black/5"
          >
            <Edit2 size={14} />
            Edit Time
          </button>
        </div>
        <p className="text-[#717182] text-[14px] mb-6">
          Track when you need to reapply sunscreen ({timerDuration >= 3600 ? `${timerDuration / 3600} hr` : `${timerDuration / 60} min`} limit)
        </p>

        <div className="bg-[#fafafa] rounded-xl px-6 py-5 flex items-center justify-between mb-4 border border-black/5">
          <div className="flex items-center gap-3">
            <Clock size={22} className={timerRunning ? "text-[#FF6900] animate-pulse" : "text-[#4a5565]"} />
            <div>
              <p className="text-[#6a7282] text-[13px]">
                {timerRunning ? "Next application in" : "Timer stopped"}
              </p>
              <p className="text-[#101828] text-[28px] tracking-wider" style={{ fontWeight: 700 }}>
                {timeDisplay}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[14px] cursor-pointer transition-colors ${
              timerRunning
                ? "bg-[#EF4444] hover:bg-[#DC2626]"
                : "bg-[#101828] hover:bg-[#2c313d]"
            }`}
            style={{ fontWeight: 500 }}
          >
            {timerRunning ? (
              <>
                <Square size={16} /> Stop
              </>
            ) : (
              <>
                <Play size={16} /> Start
              </>
            )}
          </button>
        </div>

        <button
          onClick={recordApplication}
          className="w-full bg-[#FF6900] hover:bg-[#E55E00] text-white rounded-xl px-5 py-4 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
        >
          <Droplets size={20} />
          <span className="text-[15px]" style={{ fontWeight: 600 }}>
            Record Sunscreen Application
          </span>
        </button>
      </div>

      {/* Today's Stats & Logs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Stats */}
        <div className="bg-white rounded-2xl border border-black/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-[#4a5565]" />
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
              Today's Stats
            </h3>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="bg-[#f0fdf4] rounded-xl py-4 px-5 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[13px] mb-1">Applications Today</p>
                <p className="text-[#166534] text-[24px]" style={{ fontWeight: 700 }}>
                  {applicationsToday}
                </p>
              </div>
              <Droplets size={28} className="text-[#16a34a] opacity-50" />
            </div>
            
            <div className="bg-[#eff6ff] rounded-xl py-4 px-5 flex items-center justify-between">
              <div>
                <p className="text-[#4a5565] text-[13px] mb-1">Hours Protected (Est.)</p>
                <p className="text-[#1d4ed8] text-[24px]" style={{ fontWeight: 700 }}>
                  {hoursProtected}h
                </p>
              </div>
              <Clock size={28} className="text-[#3b82f6] opacity-50" />
            </div>
          </div>
        </div>

        {/* Protection Logs */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <History size={18} className="text-[#4a5565]" />
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
              Recent Activity
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[150px]">
            {logs.length === 0 ? (
              <p className="text-[#717182] text-[14px] text-center py-8">
                No activity yet today.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 relative pb-2"
                  >
                    <div className="flex-col items-center mt-1 hidden sm:flex">
                      <div className={`w-2 h-2 rounded-full ${log.type === "Application" ? "bg-[#16a34a]" : "bg-[#FF6900]"}`} />
                      <div className="w-[1px] h-full bg-gray-200 mt-1" />
                    </div>
                    
                    <div className={`flex-1 rounded-xl px-4 py-3 flex flex-col justify-center ${
                      log.type === "Alert"
                        ? "bg-[#fff7ed] border border-[#ffedd4]"
                        : "bg-[#fafafa] border border-black/5"
                    }`}>
                      <div className="flex justify-between items-start">
                        <p className={`text-[14px] leading-tight ${log.type === "Alert" ? "text-[#9f2d00]" : "text-[#101828]"}`} style={{ fontWeight: 500 }}>
                          {log.message}
                        </p>
                        <span className="text-[#6a7282] text-[12px] whitespace-nowrap ml-2">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
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
            <button 
              onClick={() => setShowTimerEditModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-[18px] font-bold text-gray-900 mb-2">Set Timer Limit</h3>
            <p className="text-[#6a7282] text-[14px] mb-5">Choose how often you want to be reminded to reapply sunscreen.</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => updateTimerDuration(30 * 60)}
                className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${timerDuration === 1800 ? 'border-[#FF6900] bg-[#fff7ed] text-[#FF6900]' : 'border-gray-200 hover:border-[#FF6900] hover:bg-gray-50 text-gray-700'}`}
              >
                30 Minutes (High Sweating / Water)
              </button>
              <button 
                onClick={() => updateTimerDuration(60 * 60)}
                className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${timerDuration === 3600 ? 'border-[#FF6900] bg-[#fff7ed] text-[#FF6900]' : 'border-gray-200 hover:border-[#FF6900] hover:bg-gray-50 text-gray-700'}`}
              >
                1 Hour (Standard Outdoor)
              </button>
              <button 
                onClick={() => updateTimerDuration(2 * 60 * 60)}
                className={`px-4 py-3 rounded-xl border text-left font-medium transition-colors ${timerDuration === 7200 ? 'border-[#FF6900] bg-[#fff7ed] text-[#FF6900]' : 'border-gray-200 hover:border-[#FF6900] hover:bg-gray-50 text-gray-700'}`}
              >
                2 Hours (General Daily Wear)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Up Alert Modal */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-xl text-center">
            <div className="w-16 h-16 bg-[#fff7ed] rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets size={32} className="text-[#FF6900]" />
            </div>
            <h2 className="text-[22px] font-bold text-gray-900 mb-2">Time to Reapply!</h2>
            <p className="text-gray-600 mb-6 text-[15px]">
              Your sunscreen protection limit has been reached. Please apply again to maintain your protection!
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowTimeUpModal(false);
                  recordApplication();
                }} 
                className="w-full bg-[#FF6900] hover:bg-[#E55E00] text-white py-3 rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
              >
                I Applied It!
              </button>
              <button 
                onClick={() => setShowTimeUpModal(false)} 
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Remind Me Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
