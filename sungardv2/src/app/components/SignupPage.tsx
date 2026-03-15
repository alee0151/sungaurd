import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Sun } from "lucide-react";
import bgImage from "../../assets/74ceece163c51866dae49248c41b6607af7cf3a0.png";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && password && acceptedTerms) {
      // Navigate to onboarding flow upon successful registration
      navigate("/onboarding");
    } else {
      alert("Please fill in all fields and accept the terms.");
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-b from-[#FAF7FF] to-[#F1EEF5]">
      {/* Left side: Image and Branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gray-900">
        <img 
          src={bgImage} 
          alt="Sky background" 
          className="absolute inset-0 w-full h-full object-cover opacity-90" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.1)] to-[rgba(0,0,0,0.3)] mix-blend-multiply" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="w-[180px] h-[180px] rounded-full flex items-center justify-center mb-6 shadow-xl"
            style={{
              backgroundImage: "linear-gradient(136deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)",
            }}
          >
            <Sun className="text-white" size={80} strokeWidth={1.5} />
          </div>

          <div className="text-center">
            <h1 className="text-[#101828] text-[72px] tracking-tight drop-shadow-sm" style={{ fontWeight: 800, lineHeight: 1.1 }}>
              SunGuard
            </h1>
            <p className="text-[#101828] text-[24px] font-medium mt-2 drop-shadow-sm">UV Protection Monitor</p>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[500px] flex flex-col items-center">
          <h2 className="text-[48px] text-[#101828] font-bold mb-10 text-center tracking-tight">Sign Up</h2>
          
          <form onSubmit={handleRegister} className="w-full flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full h-[56px] bg-white rounded-2xl px-6 border-none outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400 placeholder:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full h-[56px] bg-white rounded-2xl px-6 border-none outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400 placeholder:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full h-[56px] bg-white rounded-2xl px-6 border-none outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400 placeholder:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-[56px] bg-white rounded-2xl px-6 border-none outline-none text-[16px] text-gray-900 shadow-sm focus:ring-2 focus:ring-[#155dfc] placeholder:text-gray-400 placeholder:opacity-50"
              />
            </div>

            <div className="flex items-center gap-3 mt-2 ml-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 accent-[#155dfc] border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="terms" className="text-[14px] text-gray-700 cursor-pointer">
                Accept Terms and Condition
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-[60px] bg-[#3B73FF] hover:bg-[#285DE6] text-white rounded-2xl text-[20px] transition-colors cursor-pointer shadow-md mt-4"
              style={{ fontWeight: 600 }}
            >
              Register
            </button>

            <p className="text-center mt-4 text-[#6a7282] text-[15px]">
              Already have an account? <Link to="/login" className="text-[#3B73FF] hover:underline font-medium">Log In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
