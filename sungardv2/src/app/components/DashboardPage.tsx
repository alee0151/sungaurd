import { AlertTriangle, Shield, Clock, TrendingUp, Sun, MapPin } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAppContext } from "./Layout";
import { UVMap } from "./UVMap";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

// US1.3 - UV Risk Colour Scale
const uvScale = [
  { label: "Low (0-2)", color: "#00C950" },
  { label: "Moderate (3-5)", color: "#F0B100" },
  { label: "High (6-7)", color: "#FF6900" },
  { label: "Very High (8-10)", color: "#FB2C36" },
  { label: "Extreme (11+)", color: "#9810FA" },
];

function getUVRange(uv: number) {
  if (uv <= 2) return "0-2";
  if (uv <= 5) return "3-5";
  if (uv <= 7) return "6-7";
  if (uv <= 10) return "8-10";
  return "11+";
}

// US3.2 - Sunscreen recommendation based on UV
type SunscreenRecommendation = {
  riskLevel: string;
  spfLevel: string;
  advice: string;
  };

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function DashboardPage() {
  const { uvData, setUVDataOverrides } = useAppContext();
  const { currentUV, riskLevel, riskColor, peakHours, hourlyForecast, locationName } = uvData;
  const [sunscreenRec, setSunscreenRec] = useState<SunscreenRecommendation | null>(null);

useEffect(() => {
  async function fetchRecommendation() {
    if (!backendUrl) {
      console.error("VITE_BACKEND_URL is not defined");
      setSunscreenRec(null);
      return;
    }

    try {
      const response = await fetch(
        `${backendUrl}/uv/recommendation?uvLevel=${currentUV}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSunscreenRec(data);
    } catch (error) {
      console.error("Failed to fetch sunscreen recommendation:", error);
      setSunscreenRec(null);
    }
  }

  fetchRecommendation();
}, [currentUV]);

  // Read user's saved location from onboarding (if any)
  const savedLocation = localStorage.getItem("sunguard_location") || undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Location Bar */}
      <div className="bg-white rounded-2xl border border-black/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-[#F54900]" />
          <div>
            <p className="text-[#717182] text-[13px] leading-tight">Current Location</p>
            <p className="text-[#0a0a0a] text-[15px]" style={{ fontWeight: 600 }}>
              {locationName}
            </p>
          </div>
        </div>
      </div>

      {/* US1.1 - UV Alert when UV >= 6 */}
      {currentUV >= 6 && (
        <div className="bg-[#fff7ed] border border-[#ff6900] rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#0a0a0a] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#7e2a0c] text-[14px]" style={{ fontWeight: 500 }}>
              High UV Alert
            </p>
            <p className="text-[#9f2d00] text-[14px]">
              UV levels are currently high ({currentUV}). Protection required. Seek shade during
              midday hours. Apply SPF 50+ sunscreen and seek shade during peak hours.
            </p>
          </div>
        </div>
      )}

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-6">
        {/* US1.1 & US1.3 - Current UV Index with colour scale */}
        <div className="bg-white rounded-2xl border border-black/10 p-6">
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
            Current UV Index
          </h3>
          <p className="text-[#717182] text-[14px] mt-1">Real-time UV radiation level</p>

          <div className="flex items-start justify-between mt-6">
            <div>
              <div className="flex items-end gap-2">
                <span
                  className="text-[#101828] text-[60px]"
                  style={{ fontWeight: 700, lineHeight: 1 }}
                >
                  {currentUV}
                </span>
                <div className="mb-2">
                  <span
                    className="bg-[var(--badge-color)] text-white text-[12px] px-2 py-0.5 rounded-lg"
                    style={
                      { fontWeight: 500, "--badge-color": riskColor } as CSSProperties
                    }
                  >
                    {riskLevel}
                  </span>
                  <p className="text-[#4a5565] text-[14px] mt-1">{getUVRange(currentUV)}</p>
                </div>
              </div>
              <p className="text-[#4a5565] text-[14px] mt-4">
                Protection required. Seek shade during midday hours.
              </p>
            </div>

            {/* US1.3 - Colour scale legend */}
            <div className="flex flex-col gap-2">
              <p className="text-[#364153] text-[12px]" style={{ fontWeight: 600 }}>
                UV Risk Scale
              </p>
              {uvScale.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#4a5565] text-[12px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Level Card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#155dfc]" />
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
              Risk Level
            </h3>
          </div>
          <div className="mt-6">
            <p className="text-[#101828] text-[30px]" style={{ fontWeight: 700 }}>
              {riskLevel}
            </p>
            <p className="text-[#4a5565] text-[14px] mt-1">Current exposure risk</p>
          </div>
        </div>

        {/* Peak Hours Card */}
        <div className="bg-white rounded-2xl border border-black/10 p-6 flex flex-col">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#9810fa]" />
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
              Peak Hours
            </h3>
          </div>
          <div className="mt-6">
            <p className="text-[#101828] text-[30px]" style={{ fontWeight: 700 }}>
              {peakHours}
            </p>
            <p className="text-[#4a5565] text-[14px] mt-1">Seek shade during this time</p>
          </div>
        </div>
      </div>

      {/* US1.2 - 12-Hour UV Forecast Chart */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-[#F54900]" />
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
            12-Hour UV Forecast
          </h3>
        </div>
        <p className="text-[#717182] text-[14px] mb-6">
          Plan your outdoor activities safely
        </p>
        <div className="h-[300px] w-full min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={hourlyForecast}>
              <defs>
                <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#6B7280" }}
                tickLine={{ stroke: "#6B7280" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#6B7280" }}
                tickLine={{ stroke: "#6B7280" }}
                label={{
                  value: "UV Index",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12, fill: "#808080" },
                }}
                domain={[0, 8]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="uv"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#uvGradient)"
                name="UV Index"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={18} className="text-[#F54900]" />
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
            Interactive UV Map
          </h3>
        </div>
        <p className="text-[#717182] text-[14px] mb-6">
          Pinpoint a location to get local UV details
        </p>
        <div className="h-[400px]">
          <UVMap 
            currentUv={currentUV} 
            onLocationSelect={(uv, name) => setUVDataOverrides(uv, name)}
            initialLocation={savedLocation}
          />
        </div>
      </div>

      {/* US3.2 - Sunscreen Recommendation */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
          Sunscreen Recommendation
        </h3>
        <p className="text-[#717182] text-[14px] mt-1">Based on current UV index</p>
        <div className="mt-4 bg-[#fff7ed] rounded-xl px-5 py-4 flex items-start gap-3">
          <Sun size={20} className="text-[#F54900] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#101828] text-[14px]" style={{ fontWeight: 600 }}>
              {sunscreenRec
              ? `${sunscreenRec.spfLevel} strongly recommended for ${riskLevel.toLowerCase()} UV levels.`
              : "Loading recommendation..."}
            </p>
            <p className="text-[#4a5565] text-[14px] mt-1">
              {sunscreenRec ? sunscreenRec.advice : "Please wait while we load advice."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}