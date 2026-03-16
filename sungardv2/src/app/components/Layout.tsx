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

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 > Date.now();
}

function clearAuthStorage() {
  [
    "sunguard_token",
    "sunguard_loggedin",
    "sunguard_username",
    "sunguard_user_id",
    "sunguard_skin_type",
    "sunguard_location",
  ].forEach((k) => localStorage.removeItem(k));
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// ---------------------------------------------------------------------------
// UV + geocoding helpers
// ---------------------------------------------------------------------------

function getUVRisk(uv: number) {
  if (uv <= 2)  return { level: "Low",       color: "#00C950" };
  if (uv <= 5)  return { level: "Moderate",  color: "#F0B100" };
  if (uv <= 7)  return { level: "High",      color: "#FF6900" };
  if (uv <= 10) return { level: "Very High", color: "#FB2C36" };
  return               { level: "Extreme",   color: "#9810FA" };
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

/** Forward geocode a plain-text location string via Nominatim (free, no API key). */
async function geocodeLocation(
  locationStr: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const results = await res.json();
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Layout component
// ---------------------------------------------------------------------------

export default function Layout() {
  const navigate = useNavigate();
  const [skinType, setSkinType]       = useState(3);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [username, setUsername]       = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  const [currentLocation, setCurrentLocation] = useState("Loading location...");
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
  // Single auth + UV bootstrap effect.
  //
  // UV location priority — strictly in order, NO fallthrough if found:
  //   1. user.location from DB   → geocode → fetchUV   (never asks for GPS)
  //   2. Browser geolocation     → reverse geocode → fetchUV  (only if no DB location)
  //   3. Melbourne default       → fetchUV  (only if geolocation denied AND no DB location)
  // -------------------------------------------------------------------------
  useEffect(() => {
    purgeExpiredUVCache();

    async function bootstrap() {
      const token = localStorage.getItem("sunguard_token");

      // --- JWT local checks (no network) ---
      if (!isTokenValid(token)) {
        clearAuthStorage();
        navigate("/login");
        return;
      }

      // --- Fetch user profile from DB ---
      let savedLocation: string | null = null;
      let authOk = false;

      try {
        const res = await fetch(`${backendUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          clearAuthStorage();
          navigate("/login");
          return;
        }

        const user = await res.json();
        setIsLoggedIn(true);
        setUsername(user.nickname || user.username);
        if (user.skin_type) setSkinType(user.skin_type);

        localStorage.setItem("sunguard_loggedin", "true");
        localStorage.setItem("sunguard_username", user.nickname || user.username);
        localStorage.setItem("sunguard_user_id",  String(user.id));

        if (user.location && user.location.trim()) {
          savedLocation = user.location.trim();
          localStorage.setItem("sunguard_location", savedLocation);
        }
        authOk = true;

      } catch {
        // Network error — try localStorage fallback
        const storedUser     = localStorage.getItem("sunguard_username");
        const storedLocation = localStorage.getItem("sunguard_location");
        if (storedUser) {
          setIsLoggedIn(true);
          setUsername(storedUser);
          if (storedLocation && storedLocation.trim()) {
            savedLocation = storedLocation.trim();
          }
          authOk = true;
        } else {
          clearAuthStorage();
          navigate("/login");
          return;
        }
      }

      // Unblock the UI — show dashboard shell while UV loads
      setAuthChecked(true);

      if (!authOk) return;

      // --- UV load: strictly use DB location if it exists ---
      if (savedLocation) {
        // Always use saved location — never prompt for GPS
        setCurrentLocation(savedLocation);
        const coords = await geocodeLocation(savedLocation);
        if (coords) {
          await loadUVForCoords(coords.lat, coords.lon, savedLocation);
        } else {
          // Geocoding failed (bad location string) — show error state, don't ask for GPS
          console.warn(`[Layout] Geocoding failed for "${savedLocation}". Check the saved location.`);
          setCurrentLocation(`${savedLocation} (location not found)`);
          setUvLoading(false);
        }
      } else {
        // No saved location at all — only NOW fall back to browser GPS
        loadUVFromGeolocation();
      }
    }

    bootstrap();
  }, [navigate]);

  /**
   * Browser geolocation path — only used when user has NO saved location in DB.
   * Never called if savedLocation is set.
   */
  function loadUVFromGeolocation() {
    setCurrentLocation("Detecting location...");
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
            const addr  = geo.address || {};
            const city  = addr.suburb || addr.city || addr.town || addr.village || addr.county || "Your Location";
            const state = addr.state || "";
            loadUVForCoords(lat, lon, state ? `${city}, ${state}` : city);
          })
          .catch(() => loadUVForCoords(lat, lon, "Your Location"));
      },
      () => loadUVForCoords(-37.8136, 144.9631, "Melbourne, AU"),
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
      console.error("[Layout] Failed to fetch UV data:", err);
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
    riskLevel:         risk.level,
    riskColor:         risk.color,
    peakHours,
    hourlyForecast,
    locationName:      currentLocation,
    uvLoading,
    uvFromCache,
    uvCacheAgeMinutes: uvCacheAge,
  };

  const navItems = [
    { to: "/dashboard",           label: "Dashboard", end: true, icon: Sun      },
    { to: "/dashboard/education", label: "Education",            icon: BookOpen },
    { to: "/dashboard/profile",   label: "Profile",              icon: User     },
    { to: "/dashboard/reminders", label: "Reminders",            icon: Bell     },
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
