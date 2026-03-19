import { useState } from "react";
import { CheckCircle, AlertCircle, Eye, FileText, X, Sun, ChevronDown } from "lucide-react";
import { useAppContext } from "./Layout";

// Fitzpatrick skin tone hex colours
const skinTypes = [
  { id: 1, name: "Type 1: Very Fair",        desc: "Always burns, never tans",             tone: "#FDDBB4" },
  { id: 2, name: "Type 2: Fair",             desc: "Usually burns, tans minimally",        tone: "#F5C498" },
  { id: 3, name: "Type 3: Medium",           desc: "Sometimes burns, gradually tans",      tone: "#D4956A" },
  { id: 4, name: "Type 4: Olive",            desc: "Rarely burns, tans easily",            tone: "#A0694A" },
  { id: 5, name: "Type 5: Brown",            desc: "Very rarely burns, tans very easily",  tone: "#6B3F2A" },
  { id: 6, name: "Type 6: Dark Brown/Black", desc: "Never burns, deeply pigmented",        tone: "#3B1F10" },
];

function getAdvice(skinType: number, uv: number) {
  const adviceMap: Record<number, { general: string; spf: string }> = {
    1: { general: "Use SPF 50+. Wear protective clothing during peak hours. Reapply sunscreen every 2 hours.", spf: "SPF 50+ is essential for your skin type." },
    2: { general: "Use SPF 50+. Wear protective clothing during peak hours. Reapply sunscreen every 2 hours.", spf: "SPF 50+ is recommended for fair skin." },
    3: { general: "Use SPF 30+. Wear protective clothing during peak hours. Reapply sunscreen every 2 hours.", spf: "SPF 30+ recommended for your skin type." },
    4: { general: "Use SPF 30+. Wear protective clothing during extended outdoor activities.",                  spf: "SPF 30+ is sufficient for most conditions." },
    5: { general: "Use SPF 15-30. Still protect against prolonged sun exposure during peak hours.",            spf: "SPF 15+ is recommended for extended outdoor time." },
    6: { general: "Use SPF 15+. Although less susceptible to burns, UV damage is still possible.",            spf: "SPF 15+ is recommended for extended outdoor time." },
  };
  const advice = adviceMap[skinType] || adviceMap[3];
  let uvAdvice = "";
  let riskText = "";
  if (uv <= 2)       { uvAdvice = "SPF 15+ is sufficient for low UV conditions.";                       riskText = "Basic sun protection recommended."; }
  else if (uv <= 5)  { uvAdvice = "SPF 30+ recommended for moderate UV.";                               riskText = "Standard sun protection measures advised."; }
  else if (uv <= 7)  { uvAdvice = "SPF 50+ strongly recommended. Seek shade during peak hours.";        riskText = "Enhanced sun protection required."; }
  else               { uvAdvice = "SPF 50+ essential. Minimize outdoor exposure.";                       riskText = "Maximum sun protection measures needed."; }
  return { ...advice, uvAdvice, riskText };
}

function getRiskLevel(uv: number, skinType: number) {
  const sensitivity = [0, 2, 1.5, 1, 0.7, 0.5, 0.3];
  const adjustedUV  = uv * (sensitivity[skinType] || 1);
  if (adjustedUV <= 3) return { level: "Low",       color: "#00C950" };
  if (adjustedUV <= 6) return { level: "Moderate",  color: "#F0B100" };
  if (adjustedUV <= 9) return { level: "High",      color: "#FF6900" };
  return                      { level: "Very High", color: "#FB2C36" };
}

const safetyTips = [
  { num: 1, title: "Apply Generously",  desc: "Use 1 teaspoon per body area" },
  { num: 2, title: "Reapply Regularly", desc: "Every 2 hours or after swimming" },
  { num: 3, title: "Cover Up",          desc: "Wear UPF clothing when possible" },
  { num: 4, title: "Check Regularly",   desc: "Monitor skin for any changes" },
];

function UVReportModal({
  open, onClose, username, skinType, uvData,
}: {
  open: boolean; onClose: () => void; username: string;
  skinType: number; uvData: { currentUV: number; location?: string };
}) {
  if (!open) return null;
  const advice        = getAdvice(skinType, uvData.currentUV);
  const risk          = getRiskLevel(uvData.currentUV, skinType);
  const skinTypeMeta  = skinTypes.find((s) => s.id === skinType);
  const skinTypeName  = skinTypeMeta?.name ?? `Type ${skinType}`;
  const now           = new Date();
  const dateStr       = now.toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr       = now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  const riskPercent   = uvData.currentUV <= 2 ? 15 : uvData.currentUV <= 5 ? 40 : uvData.currentUV <= 7 ? 85 : 100;
  const actionText    =
    risk.level === "Low"      ? "Basic sun protection is sufficient. SPF 15+ recommended for extended outdoor time."
    : risk.level === "Moderate" ? "Apply SPF 30+ sunscreen. Wear protective clothing during extended outdoor activities."
    : "Apply SPF 50+ sunscreen. Seek shade during peak hours. Wear protective clothing and hat.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="rounded-t-3xl px-8 pt-8 pb-6 relative" style={{ backgroundImage: "linear-gradient(135deg, #FF6900 0%, #f63b9a 100%)" }}>
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer">
            <X size={16} className="text-white" />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><Sun size={20} className="text-white" /></div>
            <div>
              <p className="text-white/80 text-[12px] font-semibold uppercase tracking-widest">SunGuard</p>
              <h2 className="text-white text-[22px] font-extrabold">UV Protection Report</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-2xl px-4 py-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wide mb-0.5">Generated for</p>
              <p className="text-white font-bold text-[15px]">{username || "You"}</p>
            </div>
            <div className="bg-white/15 rounded-2xl px-4 py-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wide mb-0.5">Skin Type</p>
              <div className="flex items-center gap-2 mt-0.5">
                {skinTypeMeta && <div className="w-5 h-5 rounded-full border-2 border-white/60 shadow-sm shrink-0" style={{ backgroundColor: skinTypeMeta.tone }} />}
                <p className="text-white font-bold text-[14px]">{skinTypeName}</p>
              </div>
            </div>
            <div className="bg-white/15 rounded-2xl px-4 py-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wide mb-0.5">Date</p>
              <p className="text-white font-bold text-[13px]">{dateStr}</p>
            </div>
            <div className="bg-white/15 rounded-2xl px-4 py-3">
              <p className="text-white/70 text-[11px] uppercase tracking-wide mb-0.5">Time</p>
              <p className="text-white font-bold text-[15px]">{timeStr}</p>
            </div>
          </div>
        </div>
        <div className="px-8 py-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#fff7ed] rounded-2xl p-5 flex flex-col items-center">
              <p className="text-[#9f2d00] text-[12px] font-semibold uppercase tracking-wide mb-1">Current UV Index</p>
              <p className="text-[#FF6900] text-[48px] font-extrabold leading-none">{uvData.currentUV}</p>
            </div>
            <div className="rounded-2xl p-5 flex flex-col items-center" style={{ backgroundColor: `${risk.color}18` }}>
              <p className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: risk.color }}>Your Risk Level</p>
              <p className="text-[32px] font-extrabold leading-none" style={{ color: risk.color }}>{risk.level}</p>
            </div>
          </div>
          <div>
            <p className="text-[#4a5565] text-[13px] font-semibold mb-2">Exposure Risk</p>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${riskPercent}%`, backgroundColor: risk.color }} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#fff7ed] rounded-2xl p-4"><p className="text-[#9f2d00] text-[13px] font-bold mb-1">UV-Specific Advice</p><p className="text-[#4a5565] text-[13px] leading-relaxed">{advice.uvAdvice}</p></div>
            <div className="bg-[#f0fdf4] rounded-2xl p-4"><p className="text-[#166534] text-[13px] font-bold mb-1">Risk Summary</p><p className="text-[#4a5565] text-[13px] leading-relaxed">{advice.riskText}</p></div>
          </div>
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl px-5 py-4 flex items-start gap-3">
            <CheckCircle size={18} className="text-[#16a34a] shrink-0 mt-0.5" />
            <div>
              <p className="text-[#166534] text-[14px] font-bold mb-1">Recommended Action</p>
              <p className="text-[#166534] text-[13px] leading-relaxed">{actionText}</p>
            </div>
          </div>
          <div>
            <p className="text-[#0a0a0a] text-[15px] font-bold mb-3">Sun Safety Tips</p>
            <div className="grid grid-cols-2 gap-3">
              {safetyTips.map((tip) => (
                <div key={tip.num} className="flex items-start gap-3 bg-[#fff9f5] rounded-xl p-4">
                  <div className="w-7 h-7 rounded-full bg-[#ff6900] text-white text-[13px] flex items-center justify-center shrink-0 font-bold">{tip.num}</div>
                  <div><p className="text-[#0a0a0a] text-[13px] font-semibold">{tip.title}</p><p className="text-[#6a7282] text-[12px]">{tip.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-[#9ca3af] text-[11px]">This report is personalised based on your skin type and the current UV index at the time of generation. Always consult a health professional for medical advice.</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { uvData, skinType, setSkinType, username } = useAppContext();
  const [reportOpen, setReportOpen] = useState(false);

  const risk        = getRiskLevel(uvData.currentUV, skinType);
  const riskPercent = uvData.currentUV <= 2 ? 15 : uvData.currentUV <= 5 ? 40 : uvData.currentUV <= 7 ? 85 : 100;
  const selectedSkin = skinTypes.find((s) => s.id === skinType);

  return (
    <>
      <UVReportModal open={reportOpen} onClose={() => setReportOpen(false)} username={username} skinType={skinType} uvData={uvData} />

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="rounded-2xl px-6 py-4 flex items-center justify-between gap-3"
          style={{ backgroundImage: "linear-gradient(135deg, rgba(255,137,4,0.15) 0%, rgba(246,51,154,0.15) 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff6900]/20 flex items-center justify-center"><span className="text-[18px]">👤</span></div>
            <div>
              <h2 className="text-[#0a0a0a] text-[18px]" style={{ fontWeight: 600 }}>{username ? `${username}'s Profile` : "Your Profile"}</h2>
              <p className="text-[#717182] text-[14px]">Personalised sun protection settings</p>
            </div>
          </div>
          <button onClick={() => setReportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold shadow-md hover:scale-[1.03] transition-all cursor-pointer shrink-0"
            style={{ backgroundImage: "linear-gradient(135deg, #FF6900, #f63b9a)" }}>
            <FileText size={15} /> Generate UV Report
          </button>
        </div>

        {/* Main 2-col layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Left column */}
          <div className="flex flex-col gap-6">

            {/* Skin Type Selector */}
            <div className="bg-white rounded-2xl border border-black/10 p-6">
              <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>Select Your Skin Type</h3>
              <p className="text-[#717182] text-[14px] mt-1 mb-4">Choose the option that best describes your skin</p>

              {/* Fitzpatrick tone palette */}
              <div className="flex gap-2 mb-4">
                {skinTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSkinType(type.id)}
                    title={type.name}
                    className={`rounded-full border-[3px] transition-all ${
                      skinType === type.id
                        ? "scale-125 border-[#ff6900] shadow-md"
                        : "border-gray-200 hover:scale-110 hover:border-[#ff6900]/50"
                    }`}
                    style={{ width: 36, height: 36, backgroundColor: type.tone }}
                  />
                ))}
              </div>

              {/* Dropdown */}
              <div className="relative">
                <select
                  value={skinType}
                  onChange={(e) => setSkinType(Number(e.target.value))}
                  className="w-full appearance-none bg-[#fff7ed] border border-[#ff6900] text-[#0a0a0a] text-[14px] font-medium px-4 py-3 pr-10 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff6900]/40"
                >
                  {skinTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name} — {type.desc}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ff6900] pointer-events-none" />
              </div>

              {/* Selected skin summary */}
              {selectedSkin && (
                <div className="mt-3 flex items-center gap-3 px-4 py-2.5 bg-[#fff7ed] rounded-xl border border-[#ff6900]/30">
                  <div
                    className="w-7 h-7 rounded-full shrink-0 border-2 border-white shadow"
                    style={{ backgroundColor: selectedSkin.tone }}
                  />
                  <div>
                    <p className="text-[#0a0a0a] text-[13px]">
                      <span style={{ fontWeight: 600 }}>{selectedSkin.name}</span>
                      <span className="text-[#6a7282]"> — {selectedSkin.desc}</span>
                    </p>
                  </div>
                  <CheckCircle size={15} className="text-[#00C950] shrink-0 ml-auto" />
                </div>
              )}
            </div>

            {/* General Sun Safety Tips */}
            <div className="bg-white rounded-2xl border border-black/10 p-6">
              <h3 className="text-[#0a0a0a] text-[16px] mb-4" style={{ fontWeight: 500 }}>General Sun Safety Tips</h3>
              <div className="flex flex-col gap-3">
                {safetyTips.map((tip) => (
                  <div key={tip.num} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#ff6900] text-white text-[13px] flex items-center justify-center shrink-0" style={{ fontWeight: 600 }}>{tip.num}</div>
                    <div>
                      <p className="text-[#0a0a0a] text-[14px]" style={{ fontWeight: 500 }}>{tip.title}</p>
                      <p className="text-[#6a7282] text-[13px]">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: UV Exposure Risk */}
          <div className="bg-white rounded-2xl border border-black/10 p-6 h-full">
            <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>Current UV Exposure Risk</h3>
            <p className="text-[#717182] text-[14px] mt-1 mb-4">Based on current UV index and your skin type</p>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[#4a5565] text-[13px]">Current UV Index</span>
                <p className="text-[#0a0a0a] text-[24px]" style={{ fontWeight: 700 }}>{uvData.currentUV}</p>
              </div>
              <div className="text-right">
                <span className="text-[#4a5565] text-[13px]">Your Risk Level</span>
                <p className="text-[24px]" style={{ fontWeight: 700, color: risk.color }}>{risk.level}</p>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${riskPercent}%`, backgroundColor: risk.color }} />
            </div>
            <div className="mt-4">
              <p className="text-[#0a0a0a] text-[14px] mb-2" style={{ fontWeight: 600 }}>Recommended Actions:</p>
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-[#16a34a] shrink-0" />
                <p className="text-[#166534] text-[13px]">
                  {risk.level === "Low"
                    ? "Basic sun protection is sufficient. SPF 15+ recommended for extended outdoor time."
                    : risk.level === "Moderate"
                    ? "Apply SPF 30+ sunscreen. Wear protective clothing during extended outdoor activities."
                    : "Apply SPF 50+ sunscreen. Seek shade during peak hours. Wear protective clothing and hat."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
