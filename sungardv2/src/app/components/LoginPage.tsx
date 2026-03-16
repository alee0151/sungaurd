import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Sun, Eye, EyeOff, AlertCircle } from "lucide-react";
import bgImage from "../../assets/74ceece163c51866dae49248c41b6607af7cf3a0.png";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function LoginPage() {
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/users/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        return;
      }

      // Persist token + user info
      localStorage.setItem("sunguard_token",    data.token);
      localStorage.setItem("sunguard_loggedin", "true");
      localStorage.setItem("sunguard_username", data.user.username);
      localStorage.setItem("sunguard_user_id",  String(data.user.id));
      if (data.user.skin_type) {
        localStorage.setItem("sunguard_skin_type", String(data.user.skin_type));
      }

      navigate("/dashboard");
    } catch {
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img src={bgImage} alt="Sky background" className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(233,212,255,0.4)] to-[rgba(140,127,153,0.4)] mix-blend-multiply" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[460px] px-6">
        <div
          className="w-[140px] h-[140px] rounded-full flex items-center justify-center mb-6 shadow-lg"
          style={{ backgroundImage: "linear-gradient(136deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)" }}
        >
          <Sun className="text-white" size={64} strokeWidth={1.5} />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-[#101828] text-[64px] tracking-tight" style={{ fontWeight: 800, lineHeight: 1.1 }}>SunGuard</h1>
          <p className="text-[#101828] text-[22px] font-medium mt-1">UV Protection Monitor</p>
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-[14px]">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[#101828] text-[20px] font-medium ml-2">Username or Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full h-[64px] bg-white/90 backdrop-blur-sm rounded-2xl px-6 border-none outline-none text-[18px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[#101828] text-[20px] font-medium ml-2">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-[64px] bg-white/90 backdrop-blur-sm rounded-2xl px-6 pr-14 border-none outline-none text-[18px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[64px] bg-[#4B83FF] hover:bg-[#356AF0] disabled:opacity-60 text-white rounded-2xl text-[22px] transition-colors cursor-pointer shadow-md mt-4"
            style={{ fontWeight: 600 }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p className="text-center mt-4 text-[#101828] text-[16px] font-medium">
            Don't have an account? <Link to="/signup" className="text-[#3d7bf9] hover:underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
