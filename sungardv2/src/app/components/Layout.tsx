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

// Mock hourly UV forecast data (US1.2)
function generateForecast(baseUV: number): { time: string; uv: number }[] {
  const now = new Date();
  const hour = now.getHours();
  const data: { time: string; uv: number }[] = [];
  
  // Create a realistic-looking bell curve based on the baseUV at solar noon
  for (let i = 0; i < 12; i++) {
    const h = (hour + i) % 24;
    const label = `${String(h).padStart(2, "0")}:00`;
    let uv = 0;
    
    // Simulate sun curve peaking around 13:00 (1 PM)
    if (h >= 6 && h <= 19) {
      // Distance from peak
      const dist = Math.abs(h - 13);
      // Bell curveish multiplier (drops off as dist increases)
      const factor = Math.max(0, 1 - (dist / 7));
      // Base variation and noise
      uv = baseUV * Math.sin(factor * (Math.PI / 2));
    }
    
    uv = Math.max(0, Math.round(uv * 10) / 10);
    data.push({ time: label, uv });
  }
  return data;
}

export default function Layout() {
  const navigate = useNavigate();
  const [skinType, setSkinType] = useState(3);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  
  // Location/UV state
  const [currentLocation, setCurrentLocation] = useState("Melbourne, AU");
  const [currentUV, setCurrentUV] = useState(6);

  const setUVDataOverrides = (uv: number, locationName: string) => {
    setCurrentUV(uv);
    setCurrentLocation(locationName);
  };

  useEffect(() => {
    const stored = localStorage.getItem("sunguard_loggedin");
    const storedUser = localStorage.getItem("sunguard_username");
    if (stored === "true" && storedUser) {
      setIsLoggedIn(true);
      setUsername(storedUser);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("sunguard_loggedin");
    localStorage.removeItem("sunguard_username");
    setIsLoggedIn(false);
    setUsername("");
    navigate("/");
  };

  const forecast = generateForecast(currentUV);
  const risk = getUVRisk(currentUV);

  const uvData: UVData = {
    currentUV,
    riskLevel: risk.level,
    riskColor: risk.color,
    peakHours: "10-4",
    hourlyForecast: forecast,
    locationName: currentLocation,
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

              {/* About link — goes to landing/home page */}
              <Link
                to="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] transition-colors text-[#4a5565] hover:bg-blue-50 hover:text-[#155dfc]"
                style={{ fontWeight: 500 }}
              >
                <Info size={18} />
                About
              </Link>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-200 mx-1" />

              {/* Logout button */}
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