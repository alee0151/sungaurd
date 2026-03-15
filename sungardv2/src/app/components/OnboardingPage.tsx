import { useState } from "react";
import { useNavigate } from "react-router";
import { Sun, ArrowRight, LocateFixed } from "lucide-react";
import { useAppContext } from "./Layout"; // Wait, Layout provides context, but Onboarding might not be in Layout. 
// I'll need to make sure the app context is available or I just write to localStorage.

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  
  const [name, setName] = useState("");
  const [skinType, setSkinType] = useState<number | null>(null);
  const [location, setLocation] = useState("");

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const finishOnboarding = () => {
    localStorage.setItem("sunguard_loggedin", "true");
    if (name) localStorage.setItem("sunguard_username", name);
    if (skinType !== null) localStorage.setItem("sunguard_skintype", String(skinType));
    if (location.trim()) localStorage.setItem("sunguard_location", location.trim());
    navigate("/dashboard");
  };

  const LogoHeader = () => (
    <div className="flex flex-col items-center justify-center mb-10">
      <div
        className="w-[140px] h-[140px] rounded-full flex items-center justify-center mb-6 shadow-md"
        style={{
          backgroundImage: "linear-gradient(136deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)",
        }}
      >
        <Sun className="text-white" size={64} strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h1 className="text-[#101828] text-[56px] tracking-tight" style={{ fontWeight: 800, lineHeight: 1.1 }}>
          SunGuard
        </h1>
        <p className="text-[#6a7282] text-[20px] font-medium mt-1">UV Protection Monitor</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2EDFA] to-[#E9E4F0] flex flex-col items-center py-16 px-6">
      <div className="w-full max-w-[640px] flex flex-col items-center flex-1">
        <LogoHeader />

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="flex flex-col items-center w-full max-w-[400px] mt-12 animate-in fade-in zoom-in duration-500">
            <button
              onClick={nextStep}
              className="w-full h-[72px] bg-[#3B73FF] hover:bg-[#285DE6] text-white rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md"
            >
              Get Started <ArrowRight size={28} />
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="w-full h-[72px] bg-transparent text-[#3B73FF] rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3 mt-4"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 2: Name */}
        {step === 2 && (
          <div className="flex flex-col items-center w-full max-w-[500px] mt-6 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-[36px] text-[#101828] mb-6 w-full text-left">What should we call you?</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-[72px] bg-white rounded-[24px] px-8 border-none outline-none text-[20px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] mb-12"
            />
            
            <div className="flex flex-col w-full gap-4 max-w-[400px]">
              <button
                onClick={nextStep}
                disabled={!name.trim()}
                className="w-full h-[72px] bg-[#3B73FF] hover:bg-[#285DE6] disabled:opacity-50 disabled:hover:bg-[#3B73FF] text-white rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md"
              >
                Next <ArrowRight size={28} />
              </button>
              <button
                onClick={prevStep}
                className="w-full h-[72px] bg-transparent text-[#3B73FF] rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Skin Type */}
        {step === 3 && (
          <div className="flex flex-col w-full max-w-[600px] mt-2 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-[28px] text-[#101828] mb-6 text-center">Choose your skin type</h2>
            
            <div className="flex flex-col gap-4 mb-10">
              {[
                { id: 1, label: "Very Fair: Always burns never tan" },
                { id: 2, label: "Fair: Usually Burns tans minimally" },
                { id: 3, label: "Medium: Sometimes burns, gradually tan" },
                { id: 4, label: "Olive: Rarely burns tan easily" },
                { id: 5, label: "Brown: Very rarely burns, tan very easily" },
                { id: 6, label: "Dark brown/black: Never burns, deeply pigmented" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSkinType(type.id)}
                  className={`w-full text-left px-8 py-5 rounded-[20px] text-[18px] transition-all ${
                    skinType === type.id
                      ? "bg-gradient-to-r from-[#e9d4ff] to-[#f4e8ff] shadow-md border-2 border-[#d0a3ff] text-[#101828] font-medium"
                      : "bg-white/50 hover:bg-white shadow-sm border-2 border-transparent text-[#101828] opacity-80 hover:opacity-100"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col w-full gap-4 max-w-[400px] mx-auto">
              <button
                onClick={nextStep}
                disabled={skinType === null}
                className="w-full h-[72px] bg-[#3B73FF] hover:bg-[#285DE6] disabled:opacity-50 text-white rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md"
              >
                Next <ArrowRight size={28} />
              </button>
              <button
                onClick={prevStep}
                className="w-full h-[72px] bg-transparent text-[#3B73FF] rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <div className="flex flex-col items-center w-full max-w-[500px] mt-6 animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-[36px] text-[#101828] mb-6 w-full text-left">Enter your Location</h2>
            <div className="relative w-full mb-12">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-[72px] bg-white rounded-[24px] pl-8 pr-16 border-none outline-none text-[20px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc]"
              />
              <button className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#101828] transition-colors cursor-pointer">
                <LocateFixed size={28} />
              </button>
            </div>
            
            <div className="flex flex-col w-full gap-4 max-w-[400px]">
              <button
                onClick={nextStep}
                disabled={!location.trim()}
                className="w-full h-[72px] bg-[#3B73FF] hover:bg-[#285DE6] disabled:opacity-50 text-white rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3 shadow-md"
              >
                Next <ArrowRight size={28} />
              </button>
              <button
                onClick={prevStep}
                className="w-full h-[72px] bg-transparent text-[#3B73FF] rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-3"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 5: All Set */}
        {step === 5 && (
          <div className="flex flex-col items-center w-full max-w-[500px] mt-16 animate-in zoom-in duration-500">
            <h2 className="text-[42px] font-bold text-[#101828] mb-12 text-center">You are all set!</h2>
            
            <button
              onClick={finishOnboarding}
              className="w-full max-w-[400px] h-[72px] bg-[#3B73FF] hover:bg-[#285DE6] text-white rounded-[24px] text-[28px] font-medium transition-colors cursor-pointer flex items-center justify-center shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}