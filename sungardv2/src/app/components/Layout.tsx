import { Outlet, NavLink, useNavigate, Link } from "react-router";
import { Sun, BookOpen, User, Bell, LogOut, Info } from "lucide-react";
import { createContext, useContext, useState, useEffect } from "react";

// Shared UV data context so all pages can access the same UV state
interface UVData {
  currentUV: number;
  riskLevel: string;
  riskColor: string;
  peakHours: string;
  hourlyForecast: { time: string; uv: number }[];
  locationName: string;
  uvLoading: boolean;
}

interface AppContextType {
  uvData: UVData;
  setUVDataOverrides: (uv: number, locationName: string) => void;
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

function getUVRisk(uv: number) {
  if (uv <= 2) return { level: "Low", color: "#00C950" };
  if (uv <= 5) return { level: "Moderate", color: "#F0B100" };
  if (uv <= 7) return { level: "High", color: "#FF6900" };
  if (uv <= 10) return { level: "Very High", color: "#FB2C36" };
  return { level: "Extreme", color: "#9810FA" };
}

// Derive peak hours from hourly forecast (hours where UV >= 6)
function derivePeakHours(forecast: { time: string; uv: number }[]): string {
  const peakSlots = forecast.filter((h) => h.uv >= 6).map((h) => h.time.replace(":00", ""));
  if (peakSlots.length === 0) return "No peak hours today";
  if (peakSlots.length === 1) return `${peakSlots[0]}:00`;
  return `${peakSlots[0]}:00 – ${peakSlots[peakSlots.length - 1]}:00`;
}

const OW_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

// Fetch real UV index + hourly forecast from OpenWeatherMap
async function fetchUVData(
  lat: number,
  lon: number
): Promise<{ currentUV: number; hourlyForecast: { time: string; uv: number }[] }> {
  if (!OW_API_KEY) {
    throw new Error("VITE_OPENWEATHER_API_KEY is not set in .env");
  }

  // Use the One Call API 3.0 for current + hourly UV
  // Falls back to One Call 2.5 if 3.0 subscription is not active
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&appid=${OW_API_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeatherMap API error: ${res.status}`);
  }

  const data = await res.json();

  const currentUV = Math.round(data.current.uvi * 10) / 10;

  // Build 12-hour hourly forecast from now
  const now = new Date();
  const currentHour = now.getHours();
  const hourlyForecast = (data.hourly as any[])
    .slice(0, 12)
    .map((h: any, i: number) => {
      const hour = (currentHour + i) % 24;
      return {
        time: `${String(hour).padStart(2, "0")}:00`,
        uv: Math.round((h.uvi ?? 0) * 10) / 10,
      };
    });

  return { currentUV, hourlyForecast };
}

export default function Layout() {
  const navigate = useNavigate();
  const [skinType, setSkinType] = useState(3);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  // Location/UV state
  const [currentLocation, setCurrentLocation] = useState("Detecting location...");
  const [currentUV, setCurrentUV] = useState(0);
  const [hourlyForecast, setHourlyForecast] = useState<{ time: string; uv: number }[]>([]);
  const [uvLoading, setUvLoading] = useState(true);

  // Allow map pin to override UV and location
  const setUVDataOverrides = (uv: number, locationName: string) => {
    setCurrentUV(uv);
    setCurrentLocation(locationName);
  };

  // On mount: check login, then get real UV data via geolocation
  useEffect(() => {
    const stored = localStorage.getItem("sunguard_loggedin");
    const storedUser = localStorage.getItem("sunguard_username");
    if (stored === "true" && storedUser) {
      setIsLoggedIn(true);
      setUsername(storedUser);
    } else {
      navigate("/login");
      return;
    }

    // Try to get real UV via geolocation
    if (!navigator.geolocation) {
      // Geolocation not supported — fallback to Melbourne
      loadUVForCoords(-37.8136, 144.9631, "Melbourne, AU");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        // Reverse geocode for display name using Nominatim (free, no key needed)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          .then((r) => r.json())
          .then((geo) => {
            const addr = geo.address || {};
            const city =
              addr.suburb || addr.city || addr.town || addr.village || addr.county || "Your Location";
            const state = addr.state || "";
            const locationName = state ? `${city}, ${state}` : city;
            loadUVForCoords(lat, lon, locationName);
          })
          .catch(() => loadUVForCoords(lat, lon, "Your Location"));
      },
      () => {
        // Permission denied or error — fallback to Melbourne
        loadUVForCoords(-37.8136, 144.9631, "Melbourne, AU (default)");
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [navigate]);

  async function loadUVForCoords(lat: number, lon: number, locationName: string) {
    setUvLoading(true);
    setCurrentLocation(locationName);
    try {
      const { currentUV: uv, hourlyForecast: forecast } = await fetchUVData(lat, lon);
      setCurrentUV(uv);
      setHourlyForecast(forecast);
    } catch (err) {
      console.error("Failed to fetch UV data from OpenWeatherMap:", err);
      // Fallback: set a neutral UV of 0 and empty forecast
      setCurrentUV(0);
      setHourlyForecast([]);
    } finally {
      setUvLoading(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("sunguard_loggedin");
    localStorage.removeItem("sunguard_username");
    setIsLoggedIn(false);
    setUsername("");
    navigate("/");
  };

  const risk = getUVRisk(currentUV);
  const peakHours = derivePeakHours(hourlyForecast);

  const uvData: UVData = {
    currentUV,
    riskLevel: risk.level,
    riskColor: risk.color,
    peakHours,
    hourlyForecast,
    locationName: currentLocation,
    uvLoading,
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", end: true, icon: Sun },
    { to: "/dashboard/education", label: "Education", icon: BookOpen },
    { to: "/dashboard/profile", label: "Profile", icon: User },
    { to: "/dashboard/reminders", label: "Reminders", icon: Bell },
  ];

  return (
    <AppContext.Provider
      value={{
        uvData,
        setUVDataOverrides,
        skinType,
        setSkinType,
        isLoggedIn,
        setIsLoggedIn,
        username,
        setUsername,
      }}
    >
      <div className="min-h-screen bg-[#fafafa]">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-[72px]">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)",
                }}
              >
                <Sun className="text-white" size={24} />
              </div>
              <div>
                <p className="text-[#101828] text-[18px]" style={{ fontWeight: 700 }}>
                  SunGuard
                </p>
                <p className="text-[#6a7282] text-[13px]">UV Protection Monitor</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] transition-colors ${
                      isActive
                        ? "bg-[#ffedd4] text-[#ca3500]"
                        : "text-[#4a5565] hover:bg-gray-100"
                    }`
                  }
                  style={{ fontWeight: 500 }}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}

              {/* About link */}
              <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] transition-colors text-[#4a5565] hover:bg-blue-50 hover:text-[#155dfc]"
                style={{ fontWeight: 500 }}
              >
                <Info size={18} />
                About
              </Link>

              <div className="w-px h-6 bg-gray-200 mx-1" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] transition-colors text-[#4a5565] hover:bg-red-50 hover:text-red-600 cursor-pointer"
                style={{ fontWeight: 500 }}
                title="Logout"
              >
                <LogOut size={18} />
                Logout
              </button>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-[1400px] mx-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </AppContext.Provider>
  );
}
