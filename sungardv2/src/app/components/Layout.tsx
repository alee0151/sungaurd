import { Outlet, NavLink, useNavigate, Link } from "react-router";
import { Sun, BookOpen, User, Bell, LogOut, Info } from "lucide-react";
import { createContext, useContext, useState, useEffect } from "react";
import {
  readUVCache,
  writeUVCache,
  purgeExpiredUVCache,
  cacheAgeMinutes,
  type UVCacheEntry,
} from "../utils/uvCache";

interface UVData {
  currentUV: number;
  riskLevel: string;
  riskColor: string;
  peakHours: string;
  hourlyForecast: { time: string; uv: number }[];
  locationName: string;
  uvLoading: boolean;
  uvFromCache: boolean;
  uvCacheAgeMinutes: number;
}

export interface LocationUVPayload {
  uv: number;
  locationName: string;
  hourlyForecast: { time: string; uv: number }[];
  fromCache: boolean;
  cacheAgeMinutes: number;
}

interface AppContextType {
  uvData: UVData;
  setUVDataOverrides: (payload: LocationUVPayload) => void;
  skinType: number;
  setSkinType: (type: number) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  username: string;
  setUsername: (v: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside Layout");
  return ctx;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Decode a JWT payload without verifying the signature.
 * Used client-side only to check the `exp` claim before making a network call.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Returns true if the token is present AND has not expired locally. */
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  // exp is in seconds; Date.now() is in ms
  return payload.exp * 1000 > Date.now();
}

/** Remove every sunguard key from localStorage. */
function clearAuthStorage() {
  [
    "sunguard_token",
    "sunguard_loggedin",
    "sunguard_username",
    "sunguard_user_id",
    "sunguard_skin_type",
  ].forEach((k) => localStorage.removeItem(k));
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// ---------------------------------------------------------------------------
// UV helpers (unchanged)
// ---------------------------------------------------------------------------

function getUVRisk(uv: number) {
  if (uv <= 2) return { level: "Low",       color: "#00C950" };
  if (uv <= 5) return { level: "Moderate",  color: "#F0B100" };
  if (uv <= 7) return { level: "High",      color: "#FF6900" };
  if (uv <= 10) return { level: "Very High", color: "#FB2C36" };
  return          { level: "Extreme",    color: "#9810FA" };
}

function derivePeakHours(forecast: { time: string; uv: number }[]): string {
  const peakSlots = forecast.filter((h) => h.uv >= 6).map((h) => h.time.replace(":00", ""));
  if (peakSlots.length === 0) return "No peak hours today";
  if (peakSlots.length === 1) return `${peakSlots[0]}:00`;
  return `${peakSlots[0]}:00 \u2013 ${peakSlots[peakSlots.length - 1]}:00`;
}

const OW_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

async function fetchUVFromAPI(
  lat: number,
  lon: number
): Promise<{ currentUV: number; hourlyForecast: { time: string; uv: number }[] }> {
  if (!OW_API_KEY) throw new Error("VITE_OPENWEATHER_API_KEY is not set in .env");
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&appid=${OW_API_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeatherMap API error: ${res.status}`);
  const data = await res.json();
  const currentUV = Math.round(data.current.uvi * 10) / 10;
  const currentHour = new Date().getHours();
  const hourlyForecast = (data.hourly as any[])
    .slice(0, 12)
    .map((h: any, i: number) => ({
      time: `${String((currentHour + i) % 24).padStart(2, "0")}:00`,
      uv: Math.round((h.uvi ?? 0) * 10) / 10,
    }));
  return { currentUV, hourlyForecast };
}

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------

export default function Layout() {
  const navigate = useNavigate();
  const [skinType, setSkinType]   = useState(3);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername]   = useState("");
  const [authChecked, setAuthChecked] = useState(false); // prevent flash of dashboard

  const [currentLocation, setCurrentLocation] = useState("Detecting location...");
  const [currentUV, setCurrentUV]             = useState(0);
  const [hourlyForecast, setHourlyForecast]   = useState<{ time: string; uv: number }[]>([]);
  const [uvLoading, setUvLoading]             = useState(true);
  const [uvFromCache, setUvFromCache]         = useState(false);
  const [uvCacheAge, setUvCacheAge]           = useState(0);

  const setUVDataOverrides = (payload: LocationUVPayload) => {
    setCurrentUV(payload.uv);
    setCurrentLocation(payload.locationName);
    setHourlyForecast(payload.hourlyForecast);
    setUvFromCache(payload.fromCache);
    setUvCacheAge(payload.cacheAgeMinutes);
  };

  // -------------------------------------------------------------------------
  // Auth check on mount
  // Three-layer validation:
  //   1. Token must exist in localStorage
  //   2. Token must not be locally expired (decoded exp claim)
  //   3. Token must be accepted by the backend GET /users/me
  // -------------------------------------------------------------------------
  useEffect(() => {
    purgeExpiredUVCache();

    async function checkAuth() {
      const token = localStorage.getItem("sunguard_token");

      // Layer 1 + 2: quick local checks — no network needed
      if (!isTokenValid(token)) {
        clearAuthStorage();
        navigate("/login");
        return;
      }

      // Layer 3: verify with backend (catches revoked / tampered tokens)
      try {
        const res = await fetch(`${backendUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // 401 = expired or invalid on the server side
          clearAuthStorage();
          navigate("/login");
          return;
        }

        const user = await res.json();
        setIsLoggedIn(true);
        setUsername(user.username);
        // Sync skin type from DB if available
        if (user.skin_type) setSkinType(user.skin_type);
        // Update localStorage with latest values from DB
        localStorage.setItem("sunguard_loggedin",  "true");
        localStorage.setItem("sunguard_username",  user.username);
        localStorage.setItem("sunguard_user_id",   String(user.id));

      } catch {
        // Network error — fall back to local token check only
        // (allows dashboard to load offline if token looks valid)
        const storedUsername = localStorage.getItem("sunguard_username");
        if (storedUsername) {
          setIsLoggedIn(true);
          setUsername(storedUsername);
        } else {
          clearAuthStorage();
          navigate("/login");
          return;
        }
      } finally {
        setAuthChecked(true);
      }

      // Start loading UV data once auth is confirmed
      startUVLoad();
    }

    checkAuth();
  }, [navigate]);

  function startUVLoad() {
    if (!navigator.geolocation) {
      loadUVForCoords(-37.8136, 144.9631, "Melbourne, AU");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          .then((r) => r.json())
          .then((geo) => {
            const addr = geo.address || {};
            const city = addr.suburb || addr.city || addr.town || addr.village || addr.county || "Your Location";
            const state = addr.state || "";
            loadUVForCoords(lat, lon, state ? `${city}, ${state}` : city);
          })
          .catch(() => loadUVForCoords(lat, lon, "Your Location"));
      },
      () => loadUVForCoords(-37.8136, 144.9631, "Melbourne, AU (default)"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function loadUVForCoords(lat: number, lon: number, locationName: string) {
    setUvLoading(true);
    setCurrentLocation(locationName);
    const cached = readUVCache(lat, lon);
    if (cached) {
      setCurrentUV(cached.uv);
      setHourlyForecast(cached.hourlyForecast);
      setUvFromCache(true);
      setUvCacheAge(cacheAgeMinutes(cached));
      setUvLoading(false);
      return;
    }
    try {
      const { currentUV: uv, hourlyForecast: forecast } = await fetchUVFromAPI(lat, lon);
      setCurrentUV(uv);
      setHourlyForecast(forecast);
      setUvFromCache(false);
      setUvCacheAge(0);
      writeUVCache({ uv, hourlyForecast: forecast, locationName, lat, lon, fetchedAt: Date.now() } as UVCacheEntry);
    } catch (err) {
      console.error("Failed to fetch UV data:", err);
      setCurrentUV(0);
      setHourlyForecast([]);
      setUvFromCache(false);
    } finally {
      setUvLoading(false);
    }
  }

  const handleLogout = () => {
    clearAuthStorage();
    setIsLoggedIn(false);
    setUsername("");
    navigate("/login");
  };

  // Don't render the dashboard at all until auth check completes
  // Prevents a flash of protected content before redirect
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#FF6900] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6a7282] text-[14px]">Verifying session...</p>
        </div>
      </div>
    );
  }

  const risk      = getUVRisk(currentUV);
  const peakHours = derivePeakHours(hourlyForecast);

  const uvData: UVData = {
    currentUV,
    riskLevel:        risk.level,
    riskColor:        risk.color,
    peakHours,
    hourlyForecast,
    locationName:     currentLocation,
    uvLoading,
    uvFromCache,
    uvCacheAgeMinutes: uvCacheAge,
  };

  const navItems = [
    { to: "/dashboard",            label: "Dashboard", end: true, icon: Sun      },
    { to: "/dashboard/education",  label: "Education",            icon: BookOpen },
    { to: "/dashboard/profile",    label: "Profile",              icon: User     },
    { to: "/dashboard/reminders",  label: "Reminders",            icon: Bell     },
  ];

  return (
    <AppContext.Provider value={{ uvData, setUVDataOverrides, skinType, setSkinType, isLoggedIn, setIsLoggedIn, username, setUsername }}>
      <div className="min-h-screen bg-[#fafafa]">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundImage: "linear-gradient(135deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)" }}
              >
                <Sun className="text-white" size={24} />
              </div>
              <div>
                <p className="text-[#101828] text-[18px]" style={{ fontWeight: 700 }}>SunGuard</p>
                <p className="text-[#6a7282] text-[13px]">UV Protection Monitor</p>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to} to={item.to} end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] transition-colors ${
                      isActive ? "bg-[#ffedd4] text-[#ca3500]" : "text-[#4a5565] hover:bg-gray-100"
                    }`
                  }
                  style={{ fontWeight: 500 }}
                >
                  <item.icon size={18} />{item.label}
                </NavLink>
              ))}

              <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] transition-colors text-[#4a5565] hover:bg-blue-50 hover:text-[#155dfc]"
                style={{ fontWeight: 500 }}
              >
                <Info size={18} />About
              </Link>

              {/* Logged-in username pill */}
              {username && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 text-[#4a5565] text-[13px]" style={{ fontWeight: 500 }}>
                  <User size={14} />
                  <span>{username}</span>
                </div>
              )}

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] transition-colors text-[#4a5565] hover:bg-red-50 hover:text-red-600 cursor-pointer"
                style={{ fontWeight: 500 }}
                title="Logout"
              >
                <LogOut size={18} />Logout
              </button>
            </nav>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </AppContext.Provider>
  );
}
