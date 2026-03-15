import { useState } from "react";
import { CheckCircle, AlertCircle, Eye } from "lucide-react";
import { useAppContext } from "./Layout";

// US3.1 - Skin type data
const skinTypes = [
  { id: 1, name: "Type 1: Very Fair", desc: "Always burns, never tans" },
  { id: 2, name: "Type 2: Fair", desc: "Usually burns, tans minimally" },
  { id: 3, name: "Type 3: Medium", desc: "Sometimes burns, gradually tans" },
  { id: 4, name: "Type 4: Olive", desc: "Rarely burns, tans easily" },
  { id: 5, name: "Type 5: Brown", desc: "Very rarely burns, tans very easily" },
  { id: 6, name: "Type 6: Dark Brown/Black", desc: "Never burns, deeply pigmented" },
];

// US3.1 - Personalised advice per skin type
function getAdvice(skinType: number, uv: number) {
  const adviceMap: Record<number, { general: string; spf: string }> = {
    1: {
      general:
        "Use SPF 50+. Wear protective clothing during peak hours. Reapply sunscreen every 2 hours.",
      spf: "SPF 50+ is essential for your skin type.",
    },
    2: {
      general:
        "Use SPF 50+. Wear protective clothing during peak hours. Reapply sunscreen every 2 hours.",
      spf: "SPF 50+ is recommended for fair skin.",
    },
    3: {
      general:
        "Use SPF 30+. Wear protective clothing during peak hours. Reapply sunscreen every 2 hours.",
      spf: "SPF 30+ recommended for your skin type.",
    },
    4: {
      general:
        "Use SPF 30+. Wear protective clothing during extended outdoor activities.",
      spf: "SPF 30+ is sufficient for most conditions.",
    },
    5: {
      general:
        "Use SPF 15-30. Still protect against prolonged sun exposure during peak hours.",
      spf: "SPF 15+ is recommended for extended outdoor time.",
    },
    6: {
      general:
        "Use SPF 15+. Although less susceptible to burns, UV damage is still possible.",
      spf: "SPF 15+ is recommended for extended outdoor time.",
    },
  };

  const advice = adviceMap[skinType] || adviceMap[3];

  let uvAdvice = "";
  let riskText = "";
  if (uv <= 2) {
    uvAdvice = "SPF 15+ is sufficient for low UV conditions.";
    riskText = "Basic sun protection recommended.";
  } else if (uv <= 5) {
    uvAdvice = "SPF 30+ recommended for moderate UV.";
    riskText = "Standard sun protection measures advised.";
  } else if (uv <= 7) {
    uvAdvice = "SPF 50+ strongly recommended. Seek shade during peak hours.";
    riskText = "Enhanced sun protection required.";
  } else {
    uvAdvice = "SPF 50+ essential. Minimize outdoor exposure.";
    riskText = "Maximum sun protection measures needed.";
  }

  return { ...advice, uvAdvice, riskText };
}

// US3.3 - Risk estimation
function getRiskLevel(uv: number, skinType: number) {
  const sensitivity = [0, 2, 1.5, 1, 0.7, 0.5, 0.3]; // multiplier per skin type
  const adjustedUV = uv * (sensitivity[skinType] || 1);
  if (adjustedUV <= 3) return { level: "Low", color: "#00C950" };
  if (adjustedUV <= 6) return { level: "Moderate", color: "#F0B100" };
  if (adjustedUV <= 9) return { level: "High", color: "#FF6900" };
  return { level: "Very High", color: "#FB2C36" };
}

// Color blind mode colors
const standardColors = ["#00C950", "#F0B100", "#FF6900", "#FB2C36", "#9810FA"];
const colorBlindColors = ["#0077BB", "#33BBEE", "#EE7733", "#CC3311", "#AA3377"];

const safetyTips = [
  { num: 1, title: "Apply Generously", desc: "Use 1 teaspoon per body area" },
  { num: 2, title: "Reapply Regularly", desc: "Every 2 hours or after swimming" },
  { num: 3, title: "Cover Up", desc: "Wear UPF clothing when possible" },
  { num: 4, title: "Check Regularly", desc: "Monitor skin for any changes" },
];

export default function ProfilePage() {
  const { uvData, skinType, setSkinType, username } = useAppContext();
  const [colorBlindMode, setColorBlindMode] = useState(false);

  const advice = getAdvice(skinType, uvData.currentUV);
  const risk = getRiskLevel(uvData.currentUV, skinType);

  const colorPalette = colorBlindMode ? colorBlindColors : standardColors;
  const colorLabels = ["Low", "Mod", "High", "Very", "Ext"];

  // US3.3 - Exposure risk bar
  const riskPercent =
    uvData.currentUV <= 2
      ? 15
      : uvData.currentUV <= 5
      ? 40
      : uvData.currentUV <= 7
      ? 85
      : 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div
        className="rounded-2xl px-6 py-4 flex items-center gap-3"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,137,4,0.15) 0%, rgba(246,51,154,0.15) 100%)",
        }}
      >
        <div className="w-10 h-10 rounded-full bg-[#ff6900]/20 flex items-center justify-center">
          <span className="text-[18px]">👤</span>
        </div>
        <div>
          <h2 className="text-[#0a0a0a] text-[18px]" style={{ fontWeight: 600 }}>
            {username ? `${username}'s Profile` : "Your Profile"}
          </h2>
          <p className="text-[#717182] text-[14px]">Personalized sun protection advice</p>
        </div>
      </div>

      {/* US3.1 - Skin Type Selection */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
          Select Your Skin Type
        </h3>
        <p className="text-[#717182] text-[14px] mt-1 mb-4">
          Choose the option that best describes your skin
        </p>
        <div className="flex flex-col gap-2">
          {skinTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSkinType(type.id)}
              className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all cursor-pointer ${
                skinType === type.id
                  ? "bg-[#fff7ed] border-[#ff6900]"
                  : "bg-white border-black/10 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {skinType === type.id && (
                  <span className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
                )}
                <span className="text-[#0a0a0a] text-[14px]" style={{ fontWeight: 500 }}>
                  {type.name}
                </span>
                {skinType === type.id && (
                  <CheckCircle size={16} className="text-[#00C950]" />
                )}
                <span className="text-[#6a7282] text-[14px] ml-1">{type.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* US3.1 - Personalised Protection Advice */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,137,4,0.08) 0%, rgba(246,51,154,0.08) 100%)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={18} className="text-[#FF6900]" />
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
            Your Personalized Protection Advice
          </h3>
        </div>
        <p className="text-[#717182] text-[14px] mb-4">Based on Skin Type {skinType}</p>

        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-[#3B82F6]" />
            <span className="text-[14px]" style={{ fontWeight: 600 }}>
              General Advice
            </span>
          </div>
          <p className="text-[#4a5565] text-[14px]">{advice.general}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#fff7ed] rounded-xl p-4">
            <p className="text-[#9f2d00] text-[14px]" style={{ fontWeight: 600 }}>
              Current UV: {uvData.currentUV}
            </p>
            <p className="text-[#4a5565] text-[13px] mt-1">{advice.uvAdvice}</p>
          </div>
          <div className="bg-[#f0fdf4] rounded-xl p-4">
            <p className="text-[#166534] text-[14px]" style={{ fontWeight: 600 }}>
              Risk Level: {risk.level}
            </p>
            <p className="text-[#4a5565] text-[13px] mt-1">{advice.riskText}</p>
          </div>
        </div>
      </div>

      {/* US3.3 - UV Exposure Risk Estimation */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
          Current UV Exposure Risk
        </h3>
        <p className="text-[#717182] text-[14px] mt-1 mb-4">
          Based on current UV index and your skin type
        </p>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[#4a5565] text-[13px]">Current UV Index</span>
            <p className="text-[#0a0a0a] text-[24px]" style={{ fontWeight: 700 }}>
              {uvData.currentUV}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[#4a5565] text-[13px]">Your Risk Level</span>
            <p className="text-[24px]" style={{ fontWeight: 700, color: risk.color }}>
              {risk.level}
            </p>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${riskPercent}%`, backgroundColor: risk.color }}
          />
        </div>

        {/* Recommended Actions */}
        <div className="mt-4">
          <p className="text-[#0a0a0a] text-[14px] mb-2" style={{ fontWeight: 600 }}>
            Recommended Actions:
          </p>
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

      {/* General Safety Tips */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px] mb-4" style={{ fontWeight: 500 }}>
          General Sun Safety Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safetyTips.map((tip) => (
            <div key={tip.num} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#ff6900] text-white text-[13px] flex items-center justify-center shrink-0" style={{ fontWeight: 600 }}>
                {tip.num}
              </div>
              <div>
                <p className="text-[#0a0a0a] text-[14px]" style={{ fontWeight: 500 }}>
                  {tip.title}
                </p>
                <p className="text-[#6a7282] text-[13px]">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accessibility Settings */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
          Accessibility Settings
        </h3>
        <p className="text-[#717182] text-[14px] mt-1 mb-4">
          Customize the app for better visibility and usability
        </p>

        {/* Color Blind Mode */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye size={18} className="text-[#4a5565]" />
            <div>
              <p className="text-[#0a0a0a] text-[14px]" style={{ fontWeight: 500 }}>
                Color Blind Mode
              </p>
              <p className="text-[#6a7282] text-[13px]">Uses color-blind friendly palette</p>
            </div>
          </div>
          <button
            onClick={() => setColorBlindMode(!colorBlindMode)}
            className={`w-11 h-6 rounded-full transition-colors cursor-pointer ${
              colorBlindMode ? "bg-[#FF6900]" : "bg-gray-300"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                colorBlindMode ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Color Preview */}
        <div className="mb-4">
          <p className="text-[#4a5565] text-[12px] mb-2">
            {colorBlindMode ? "Color Blind" : "Standard"} Colors
          </p>
          <div className="flex gap-0">
            {colorPalette.map((color, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full h-8 first:rounded-l-lg last:rounded-r-lg"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-[#6a7282] mt-1">{colorLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info about color blind mode */}
        <div className="bg-[#eff6ff] rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-[#3B82F6] mt-0.5 shrink-0" />
          <p className="text-[#1e40af] text-[12px]">
            This mode uses colors that are easier to distinguish for people with color vision
            deficiencies, particularly deuteranopia and protanopia (red-green color blindness).
            The palette uses blue, cyan, orange, pink, and indigo instead of green, yellow,
            orange, red, and purple.
          </p>
        </div>
      </div>
    </div>
  );
}
