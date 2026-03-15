import { Info, AlertCircle, Globe, Clock, Droplets, Eye } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// US2.1 - Skin cancer incidence trends data (Australia)
const cancerData = [
  { year: "2014", cases: 12200 },
  { year: "2015", cases: 12800 },
  { year: "2016", cases: 13100 },
  { year: "2017", cases: 13500 },
  { year: "2018", cases: 14000 },
  { year: "2019", cases: 14200 },
  { year: "2020", cases: 14500 },
  { year: "2021", cases: 14800 },
  { year: "2022", cases: 15200 },
  { year: "2023", cases: 16500 },
];

// US2.2 - Sun protection behaviour data (Australia)
const behaviourData = [
  { behaviour: "Sunscreen use", percentage: 67 },
  { behaviour: "Wearing hats", percentage: 52 },
  { behaviour: "Seeking shade", percentage: 60 },
  { behaviour: "Protective clothing", percentage: 44 },
  { behaviour: "Sunglasses", percentage: 72 },
  { behaviour: "Avoiding peak hours", percentage: 34 },
];

// US2.3 - Myths data
const myths = [
  {
    emoji: "☁️",
    myth: "You can't get sunburned on a cloudy day",
    truth:
      "Up to 80% of UV rays can penetrate clouds. You still need sun protection on overcast days.",
  },
  {
    emoji: "👥",
    myth: "Only fair-skinned people need sun protection",
    truth:
      "People of all skin types can experience UV damage and are at risk for skin cancer. Everyone needs protection.",
  },
  {
    emoji: "😎",
    myth: "A tan is healthy and provides protection",
    truth:
      "A tan is actually a sign of skin damage. It provides minimal protection (equivalent to SPF 2-4) and increases cancer risk.",
  },
  {
    emoji: "🧴",
    myth: "Sunscreen prevents vitamin D production",
    truth:
      "Even with sunscreen, you still produce vitamin D. Only 10-15 minutes of sun exposure a few times per week is needed.",
  },
  {
    emoji: "❄️",
    myth: "You don't need sunscreen in winter",
    truth:
      "UV rays are present year-round. Snow can reflect up to 80% of UV rays, increasing exposure during winter.",
  },
];

// Did You Know? facts
const facts = [
  {
    emoji: "🌏",
    title: "Australia's UV Levels",
    text: "Australia has some of the highest UV radiation levels in the world due to the ozone hole over Antarctica and clear atmospheric conditions.",
    bg: "bg-[#fff7ed]",
  },
  {
    emoji: "⏰",
    title: "Timing Matters",
    text: "UV radiation is strongest between 10 AM and 4 PM. Even on cloudy days, up to 80% of UV rays can reach your skin.",
    bg: "bg-[#eff6ff]",
  },
  {
    emoji: "🧴",
    title: "Sunscreen Application",
    text: "Most people apply only 25-50% of the recommended amount of sunscreen. Use about 1 teaspoon per limb and body area.",
    bg: "bg-[#fef3c7]",
  },
  {
    emoji: "👁️",
    title: "Eye Protection",
    text: "UV exposure can damage your eyes and increase the risk of cataracts. Always wear sunglasses that block 99-100% of UV rays.",
    bg: "bg-[#fef2f2]",
  },
];

export default function EducationPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* US2.1 - Skin Cancer Incidence Trends */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#F54900]">📈</span>
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
            Skin Cancer Incidence Trends in Australia
          </h3>
        </div>
        <p className="text-[#717182] text-[14px] mb-6">
          Annual melanoma cases over the past decade
        </p>
        <div className="h-[280px] w-full min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={cancerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#6B7280" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6B7280" }}
                axisLine={{ stroke: "#6B7280" }}
                label={{
                  value: "Cases",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12, fill: "#808080" },
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cases"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: "#EF4444", r: 4 }}
                name="Melanoma Cases"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight Box */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-5 py-4 flex items-start gap-3">
        <Info size={18} className="text-[#1d4ed8] mt-0.5 shrink-0" />
        <div>
          <p className="text-[#1e3a5f] text-[14px]" style={{ fontWeight: 500 }}>
            Important Insight
          </p>
          <p className="text-[#1e40af] text-[14px]">
            Skin cancer rates have increased by 35% over the past decade. Early detection and
            prevention through sun protection are crucial.
          </p>
        </div>
      </div>

      {/* US2.2 - Sun Protection Behaviours Chart */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span>👥</span>
          <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
            Sun Protection Behaviors
          </h3>
        </div>
        <p className="text-[#717182] text-[14px] mb-6">
          Common protective practices in Australia
        </p>
        <div className="h-[300px] w-full min-w-0 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={behaviourData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                label={{
                  value: "Percentage of People",
                  position: "insideBottom",
                  offset: -5,
                  style: { fontSize: 12, fill: "#808080" },
                }}
                domain={[0, 80]}
              />
              <YAxis
                type="category"
                dataKey="behaviour"
                tick={{ fontSize: 12, fill: "#6B7280" }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
                formatter={(value: number) => [`${value}%`, "Percentage"]}
              />
              <Bar
                dataKey="percentage"
                fill="#3B82F6"
                radius={[0, 4, 4, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Key Finding */}
        <div className="bg-[#fef3c7] rounded-xl px-5 py-3 mt-4">
          <p className="text-[#92400e] text-[13px]">
            <span style={{ fontWeight: 600 }}>Key Finding:</span> While many Australians use
            sunglasses and sunscreen, only 34% avoid peak UV hours. Combining multiple
            protection strategies significantly reduces UV exposure risk.
          </p>
        </div>
      </div>

      {/* US2.3 - Myths Section */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px]" style={{ fontWeight: 500 }}>
          Common Myths About Sun Safety
        </h3>
        <p className="text-[#717182] text-[14px] mt-1 mb-6">
          Fact-checking popular misconceptions
        </p>
        <div className="flex flex-col gap-4">
          {myths.map((item) => (
            <div key={item.myth} className="bg-[#fafafa] rounded-xl p-5 flex items-start gap-4">
              <span className="text-[24px] shrink-0">{item.emoji}</span>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={16} className="text-[#EF4444] shrink-0" />
                  <p className="text-[#0a0a0a] text-[14px]" style={{ fontWeight: 500 }}>
                    Myth: {item.myth}
                  </p>
                </div>
                <p className="text-[#4a5565] text-[14px]">
                  <span className="text-[#EF4444]" style={{ fontWeight: 600 }}>
                    Truth:{" "}
                  </span>
                  {item.truth}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Did You Know? */}
      <div className="bg-white rounded-2xl border border-black/10 p-6">
        <h3 className="text-[#0a0a0a] text-[16px] mb-4" style={{ fontWeight: 500 }}>
          Did You Know?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facts.map((fact) => (
            <div key={fact.title} className={`${fact.bg} rounded-xl p-5`}>
              <p className="text-[14px] mb-2" style={{ fontWeight: 600 }}>
                {fact.emoji} {fact.title}
              </p>
              <p className="text-[13px] text-[#4a5565]">{fact.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
