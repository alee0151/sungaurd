import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Sun } from "lucide-react";
import bgImage from "../../assets/74ceece163c51866dae49248c41b6607af7cf3a0.png";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem("sunguard_loggedin", "true");
      localStorage.setItem("sunguard_username", username.trim());
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={bgImage} 
          alt="Sky background" 
          className="w-full h-full object-cover opacity-80" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(233,212,255,0.4)] to-[rgba(140,127,153,0.4)] mix-blend-multiply" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[460px] px-6">
        {/* Logo */}
        <div
          className="w-[140px] h-[140px] rounded-full flex items-center justify-center mb-6 shadow-lg"
          style={{
            backgroundImage: "linear-gradient(136deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)",
          }}
        >
          <Sun className="text-white" size={64} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-[#101828] text-[64px] tracking-tight" style={{ fontWeight: 800, lineHeight: 1.1 }}>
            SunGuard
          </h1>
          <p className="text-[#101828] text-[22px] font-medium mt-1">UV Protection Monitor</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[#101828] text-[20px] font-medium ml-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-[64px] bg-white/90 backdrop-blur-sm rounded-2xl px-6 border-none outline-none text-[18px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc]"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[#101828] text-[20px] font-medium ml-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[64px] bg-white/90 backdrop-blur-sm rounded-2xl px-6 border-none outline-none text-[18px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc]"
            />
          </div>

          <button
            type="submit"
            className="w-full h-[64px] bg-[#4B83FF] hover:bg-[#356AF0] text-white rounded-2xl text-[22px] transition-colors cursor-pointer shadow-md mt-4"
            style={{ fontWeight: 600 }}
          >
            Log In
          </button>
          
          <p className="text-center mt-4 text-[#101828] text-[16px] font-medium">
            Click here for <Link to="/signup" className="text-[#3d7bf9] hover:underline">register account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
