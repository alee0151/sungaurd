import { useState } from "react";
import { useNavigate } from "react-router";
import { Sun, ArrowRight, LocateFixed, Loader2, CheckCircle2 } from "lucide-react";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const SKIN_TYPES = [
  { id: 1, label: "Type I — Very Fair",       desc: "Always burns, never tans" },
  { id: 2, label: "Type II — Fair",            desc: "Usually burns, tans minimally" },
  { id: 3, label: "Type III — Medium",         desc: "Sometimes burns, gradually tans" },
  { id: 4, label: "Type IV — Olive",           desc: "Rarely burns, tans easily" },
  { id: 5, label: "Type V — Brown",            desc: "Very rarely burns, tans very easily" },
  { id: 6, label: "Type VI — Dark Brown/Black", desc: "Never burns, deeply pigmented" },
];

export default function OnboardingPage() {
  const [step, setStep]         = useState(1);
  const navigate                = useNavigate();

  const [nickname, setNickname] = useState("");
  const [skinType, setSkinType] = useState<number | null>(null);
  const [location, setLocation] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  /** Detect current location using browser geolocation + reverse geocoding */
  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocation("Detecting...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          .then((r) => r.json())
          .then((geo) => {
            const addr = geo.address || {};
            const city  = addr.suburb || addr.city || addr.town || addr.village || "Your Location";
            const state = addr.state || "";
            setLocation(state ? `${city}, ${state}` : city);
          })
          .catch(() => setLocation(""));
      },
      () => setLocation("")
    );
  };

  /** Save all onboarding fields to the DB via PATCH /users/me */
  const finishOnboarding = async () => {
    setError("");
    setSaving(true);

    const token = localStorage.getItem("sunguard_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/users/me`, {
        method:  "PATCH",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname:  nickname.trim() || null,
          skin_type: skinType,
          location:  location.trim() || null,
          onboarded: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save your profile. Please try again.");
        setSaving(false);
        return;
      }

      const updated = await res.json();

      // Sync localStorage with the saved values
      localStorage.setItem("sunguard_loggedin",  "true");
      if (updated.nickname)  localStorage.setItem("sunguard_username",  updated.nickname);
      if (updated.skin_type) localStorage.setItem("sunguard_skin_type", String(updated.skin_type));
      if (updated.location)  localStorage.setItem("sunguard_location",  updated.location);

      navigate("/dashboard");
    } catch {
      setError("Could not reach the server. Please check your connection.");
      setSaving(false);
    }
  };

  const LogoHeader = () => (
    <div className="flex flex-col items-center justify-center mb-10">
      <div
        className="w-[140px] h-[140px] rounded-full flex items-center justify-center mb-6 shadow-md"
        style={{ backgroundImage: "linear-gradient(136deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)" }}
      >
        <Sun className="text-white" size={64} strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h1 className="text-[#101828] text-[56px] tracking-tight" style={{ fontWeight: 800, lineHeight: 1.1 }}>SunGuard</h1>
        <p className="text-[#6a7282] text-[20px] font-medium mt-1">UV Protection Monitor</p>
      </div>
    </div>
  );

  // Progress dots
  const totalSteps = 5;
  const ProgressDots = () => (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i + 1 === step
              ? "w-6 h-3 bg-[#3B73FF]"
              : i + 1 < step
              ? "w-3 h-3 bg-[#3B73FF] opacity-50"
              : "w-3 h-3 bg-gray-300"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2EDFA] to-[#E9E4F0] flex flex-col items-center py-16 px-6">
      <div className="w-full max-w-[640px] flex flex-col items-center flex-1">
        <LogoHeader />
        {step > 1 && step < 5 && <ProgressDots />}

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="flex flex-col items-center w-full max-w-[400px] mt-12 animate-in fade-in zoom-in duration-500">
            <p className="text-[#6a7282] text-[18px] text-center mb-10">Let's set up your personal UV protection profile. It only takes a minute.</p>
            <button
              onClick={nextStep}
              className="w-full h-[72px] bg-[#3B73FF] hover:bg-[#285DE6] text-white rounded-[24px] text-[24px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md"
            >
              Get Started <ArrowRight size={26} />
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="w-full h-[56px] bg-transparent text-[#3B73FF] rounded-[24px] text-[18px] font-medium cursor-pointer flex items-center justify-center mt-3"
            >
              Back to Sign Up
            </button>
          </div>
        )}

        {/* Step 2: Nickname */}
        {step === 2 && (
          <div className="flex flex-col items-center w-full max-w-[500px] mt-4 animate-in slide-in-from-right-8 duration-400">
            <h2 className="text-[32px] text-[#101828] font-bold mb-2 w-full text-left">What should we call you?</h2>
            <p className="text-[#6a7282] text-[15px] w-full text-left mb-6">This is the name shown in your dashboard.</p>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your nickname"
              className="w-full h-[64px] bg-white rounded-[20px] px-6 border-none outline-none text-[20px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] mb-10 placeholder:text-gray-300"
            />
            <div className="flex flex-col w-full gap-3">
              <button onClick={nextStep} className="w-full h-[64px] bg-[#3B73FF] hover:bg-[#285DE6] text-white rounded-[22px] text-[22px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md">
                Next <ArrowRight size={24} />
              </button>
              <button onClick={prevStep} className="w-full h-[52px] bg-transparent text-[#3B73FF] rounded-[22px] text-[18px] font-medium cursor-pointer flex items-center justify-center">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Skin Type */}
        {step === 3 && (
          <div className="flex flex-col w-full max-w-[600px] mt-2 animate-in slide-in-from-right-8 duration-400">
            <h2 className="text-[30px] text-[#101828] font-bold mb-1">What's your skin type?</h2>
            <p className="text-[#6a7282] text-[14px] mb-6">Used to personalise your UV exposure risk advice (Fitzpatrick scale).</p>
            <div className="flex flex-col gap-3 mb-8">
              {SKIN_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSkinType(type.id)}
                  className={`w-full text-left px-6 py-4 rounded-[18px] transition-all flex items-center justify-between ${
                    skinType === type.id
                      ? "bg-gradient-to-r from-[#e9d4ff] to-[#f4e8ff] shadow-md border-2 border-[#d0a3ff]"
                      : "bg-white/60 hover:bg-white shadow-sm border-2 border-transparent"
                  }`}
                >
                  <div>
                    <p className="text-[16px] font-semibold text-[#101828]">{type.label}</p>
                    <p className="text-[13px] text-[#6a7282] mt-0.5">{type.desc}</p>
                  </div>
                  {skinType === type.id && <CheckCircle2 size={22} className="text-[#9810FA] shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 max-w-[420px] mx-auto w-full">
              <button onClick={nextStep} disabled={skinType === null} className="w-full h-[64px] bg-[#3B73FF] hover:bg-[#285DE6] disabled:opacity-50 text-white rounded-[22px] text-[22px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md">
                Next <ArrowRight size={24} />
              </button>
              <button onClick={prevStep} className="w-full h-[52px] bg-transparent text-[#3B73FF] rounded-[22px] text-[18px] font-medium cursor-pointer flex items-center justify-center">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div className="flex flex-col items-center w-full max-w-[500px] mt-4 animate-in slide-in-from-right-8 duration-400">
            <h2 className="text-[32px] text-[#101828] font-bold mb-2 w-full text-left">Where are you based?</h2>
            <p className="text-[#6a7282] text-[15px] w-full text-left mb-6">Used to personalise UV alerts for your area.</p>
            <div className="relative w-full mb-10">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Melbourne, Victoria"
                className="w-full h-[64px] bg-white rounded-[20px] pl-6 pr-16 border-none outline-none text-[18px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-300"
              />
              <button
                type="button"
                onClick={detectLocation}
                title="Detect my location"
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#3B73FF] transition-colors cursor-pointer"
              >
                <LocateFixed size={26} />
              </button>
            </div>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={nextStep}
                disabled={!location.trim() || location === "Detecting..."}
                className="w-full h-[64px] bg-[#3B73FF] hover:bg-[#285DE6] disabled:opacity-50 text-white rounded-[22px] text-[22px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md"
              >
                Next <ArrowRight size={24} />
              </button>
              <button onClick={prevStep} className="w-full h-[52px] bg-transparent text-[#3B73FF] rounded-[22px] text-[18px] font-medium cursor-pointer flex items-center justify-center">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 5: All Set */}
        {step === 5 && (
          <div className="flex flex-col items-center w-full max-w-[500px] mt-12 animate-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircle2 size={44} className="text-green-500" />
            </div>
            <h2 className="text-[40px] font-bold text-[#101828] mb-3 text-center">You're all set!</h2>
            <div className="bg-white/70 rounded-[20px] p-6 w-full mb-8 flex flex-col gap-3">
              {nickname && (
                <div className="flex justify-between text-[15px]">
                  <span className="text-[#6a7282] font-medium">Nickname</span>
                  <span className="text-[#101828] font-semibold">{nickname}</span>
                </div>
              )}
              {skinType && (
                <div className="flex justify-between text-[15px]">
                  <span className="text-[#6a7282] font-medium">Skin type</span>
                  <span className="text-[#101828] font-semibold">{SKIN_TYPES.find(s => s.id === skinType)?.label}</span>
                </div>
              )}
              {location && (
                <div className="flex justify-between text-[15px]">
                  <span className="text-[#6a7282] font-medium">Location</span>
                  <span className="text-[#101828] font-semibold">{location}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[14px]">
                {error}
              </div>
            )}

            <button
              onClick={finishOnboarding}
              disabled={saving}
              className="w-full h-[68px] bg-[#3B73FF] hover:bg-[#285DE6] disabled:opacity-60 text-white rounded-[22px] text-[22px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-lg"
            >
              {saving ? (
                <><Loader2 size={24} className="animate-spin" /> Saving...</>
              ) : (
                <>Go to Dashboard <ArrowRight size={24} /></>
              )}
            </button>
            <button onClick={prevStep} className="w-full h-[52px] bg-transparent text-[#3B73FF] rounded-[22px] text-[18px] font-medium cursor-pointer flex items-center justify-center mt-2">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
