import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Sun, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import bgImage from "../../assets/74ceece163c51866dae49248c41b6607af7cf3a0.png";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function SignupPage() {
  const [username, setUsername]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAccepted]  = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();

  const pwStrong = password.length >= 8;
  const pwMatch  = password === confirmPw && confirmPw.length > 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password || !confirmPw) {
      setError("Please fill in all fields.");
      return;
    }
    if (!pwMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the terms and conditions.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/users/signup`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          username: username.trim(),
          email:    email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed. Please try again.");
        return;
      }

      // Auto-login after successful signup
      localStorage.setItem("sunguard_token",    data.token);
      localStorage.setItem("sunguard_loggedin", "true");
      localStorage.setItem("sunguard_username", data.user.username);
      localStorage.setItem("sunguard_user_id",  String(data.user.id));

      navigate("/onboarding");
    } catch {
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-[#FAF7FF] to-[#F1EEF5]">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gray-900">
        <img src={bgImage} alt="Sky background" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.1)] to-[rgba(0,0,0,0.3)] mix-blend-multiply" />
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="w-[180px] h-[180px] rounded-full flex items-center justify-center mb-6 shadow-xl"
            style={{ backgroundImage: "linear-gradient(136deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)" }}
          >
            <Sun className="text-white" size={80} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-white text-[72px] tracking-tight drop-shadow-sm" style={{ fontWeight: 800, lineHeight: 1.1 }}>SunGuard</h1>
            <p className="text-white/90 text-[24px] font-medium mt-2">UV Protection Monitor</p>
          </div>
        </div>
      </div>

      {/* Right panel: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[500px] flex flex-col">
          <h2 className="text-[42px] text-[#101828] font-bold mb-2 tracking-tight">Create account</h2>
          <p className="text-[#6a7282] text-[15px] mb-8">Already have one? <Link to="/login" className="text-[#3B73FF] hover:underline font-medium">Log in</Link></p>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[14px]">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="w-full h-[56px] bg-white rounded-2xl px-6 border border-black/8 outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="w-full h-[56px] bg-white rounded-2xl px-6 border border-black/8 outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400"
            />

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 characters)"
                autoComplete="new-password"
                className="w-full h-[56px] bg-white rounded-2xl px-6 pr-14 border border-black/8 outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength hint */}
            {password.length > 0 && (
              <div className={`flex items-center gap-2 text-[13px] -mt-2 ml-1 ${
                pwStrong ? "text-green-600" : "text-amber-600"
              }`}>
                <CheckCircle2 size={14} />
                {pwStrong ? "Strong password" : "Use at least 8 characters for a stronger password"}
              </div>
            )}

            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className={`w-full h-[56px] bg-white rounded-2xl px-6 pr-14 border outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400 ${
                  confirmPw.length > 0
                    ? pwMatch ? "border-green-400" : "border-red-400"
                    : "border-black/8"
                }`}
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center gap-3 ml-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-5 h-5 accent-[#155dfc] border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="terms" className="text-[14px] text-gray-700 cursor-pointer">
                I accept the Terms and Conditions
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[60px] bg-[#3B73FF] hover:bg-[#285DE6] disabled:opacity-60 text-white rounded-2xl text-[20px] transition-colors cursor-pointer shadow-md mt-2"
              style={{ fontWeight: 600 }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
