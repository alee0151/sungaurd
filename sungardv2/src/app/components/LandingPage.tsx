import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Sun, Shield, Activity, Bell, ChevronRight, LayoutDashboard, LogOut, User } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export default function LandingPage() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("sunguard_loggedin");
    const storedUser = localStorage.getItem("sunguard_username");
    if (stored === "true" && storedUser) {
      setIsLoggedIn(true);
      setUsername(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("sunguard_loggedin");
    localStorage.removeItem("sunguard_username");
    setIsLoggedIn(false);
    setUsername("");
    // Stay on home page — now in logged-out state
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
              style={{
                backgroundImage: "linear-gradient(136deg, rgb(255, 137, 4) 0%, rgb(246, 51, 154) 100%)",
              }}
            >
              <Sun className="text-white" size={20} strokeWidth={2} />
            </div>
            <span className="text-[#101828] text-[22px] font-bold tracking-tight">SunGuard</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-[#155dfc] font-medium transition-colors">Features</a>
            <a href="#about" className="text-gray-600 hover:text-[#155dfc] font-medium transition-colors">About Us</a>
            <a href="#faq" className="text-gray-600 hover:text-[#155dfc] font-medium transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Logged-in state: welcome chip + dashboard button + logout */}
                <div className="hidden sm:flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shrink-0">
                    <User size={13} className="text-white" />
                  </div>
                  <span className="text-orange-700 text-sm font-semibold truncate max-w-[120px]">
                    {username}
                  </span>
                </div>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 bg-[#155dfc] hover:bg-[#1248d0] text-white px-5 py-2.5 rounded-full font-semibold text-sm transition-colors shadow-md"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-full font-semibold text-sm transition-colors cursor-pointer"
                  title="Log out"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </>
            ) : (
              <>
                {/* Logged-out state: classic login + signup */}
                <Link to="/login" className="hidden sm:block text-gray-700 hover:text-[#101828] font-semibold transition-colors">
                  Log In
                </Link>
                <Link to="/signup" className="bg-[#155dfc] hover:bg-[#1248d0] text-white px-6 py-2.5 rounded-full font-semibold transition-colors shadow-md">
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1717941826824-458477f5a65d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwb3V0ZG9vcnMlMjBzdW5ueSUyMHN1bW1lciUyMGJlYWNofGVufDF8fHx8MTc3MzM4NzM4NXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Friends outdoors"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
          </div>

          <div className="max-w-[1200px] mx-auto px-6 relative z-10 flex">
            <div className="max-w-[600px] pt-12 md:pt-24">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm mb-6 border border-orange-200">
                <Sun size={16} /> <span>Your Personal UV Assistant</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-[#101828] leading-[1.1] tracking-tight mb-6">
                Enjoy the sun, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500">safely.</span>
              </h1>
              <p className="text-[20px] text-gray-700 mb-10 leading-relaxed max-w-[500px]">
                SunGuard monitors real-time UV indexes for your location and sends personalized reminders to reapply sunscreen, tailored to your skin type.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {isLoggedIn ? (
                  <>
                    {/* Already logged in — take them to dashboard */}
                    <Link
                      to="/dashboard"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#155dfc] hover:bg-[#1248d0] text-white px-8 py-4 rounded-full text-[18px] font-semibold transition-transform hover:scale-105 shadow-lg"
                    >
                      <LayoutDashboard size={22} /> Go to Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full text-[18px] font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <LogOut size={20} /> Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#155dfc] hover:bg-[#1248d0] text-white px-8 py-4 rounded-full text-[18px] font-semibold transition-transform hover:scale-105 shadow-lg"
                    >
                      Get Started <ChevronRight size={20} />
                    </Link>
                    <Link
                      to="/login"
                      className="w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-full text-[18px] font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      I have an account
                    </Link>
                  </>
                )}
              </div>

              {/* Welcome banner for logged-in users */}
              {isLoggedIn && (
                <div className="mt-8 inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-green-800 text-sm font-semibold">Welcome back, {username}! 👋</p>
                    <p className="text-green-600 text-xs">You're logged in. Head to your dashboard to check UV levels.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white relative">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-[800px] mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-[#101828] mb-4">Smart Protection for Every Day</h2>
              <p className="text-lg text-gray-600">We take the guesswork out of sun protection so you can focus on having fun outdoors.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Activity,
                  color: "text-blue-500",
                  bg: "bg-blue-100",
                  title: "Real-Time Tracking",
                  desc: "Get precise UV index data for your exact location, updated hourly to keep you informed of peak radiation times."
                },
                {
                  icon: Shield,
                  color: "text-orange-500",
                  bg: "bg-orange-100",
                  title: "Personalized Advice",
                  desc: "By understanding your specific skin type, SunGuard calculates exactly how long you can safely stay in the sun."
                },
                {
                  icon: Bell,
                  color: "text-pink-500",
                  bg: "bg-pink-100",
                  title: "Smart Reminders",
                  desc: "Never forget to reapply! Start a timer when you put on sunscreen and get an alert when it's time for more."
                }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                    <feature.icon className={feature.color} size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About Section Split Layout */}
        <section id="about" className="py-24 bg-[#fafafa]">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="w-full lg:w-1/2 order-2 lg:order-1">
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-[4/3]">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1751821195194-0bbc1caab446?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdXR0aW5nJTIwb24lMjBzdW5zY3JlZW58ZW58MXx8fHwxNzczMzg3MzkxfDA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Applying sunscreen"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="w-full lg:w-1/2 order-1 lg:order-2">
                <h2 className="text-4xl font-bold text-gray-900 mb-6 tracking-tight">Why SunGuard?</h2>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Skin cancer is one of the most preventable forms of cancer, yet rates continue to rise globally. We built SunGuard to make sun safety habitual, effortless, and tailored specifically to you.
                </p>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Whether you're hitting the beach, going for a run, or just going about your daily commute, we provide the intelligence you need to protect your skin's health long-term.
                </p>
                <ul className="flex flex-col gap-4">
                  {["Backed by dermatological data", "Global location coverage", "Completely free to use"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-gray-800 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#155dfc] to-[#9810FA] z-0" />
          <div className="max-w-[800px] mx-auto px-6 relative z-10 text-center">
            {isLoggedIn ? (
              <>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Welcome back, {username}!
                </h2>
                <p className="text-xl text-white/90 mb-10">
                  Your UV dashboard is ready. Stay protected and check today's UV levels.
                </p>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 bg-white text-[#155dfc] px-10 py-4 rounded-full text-[18px] font-bold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
                >
                  <LayoutDashboard size={22} /> Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to protect your skin?</h2>
                <p className="text-xl text-white/90 mb-10">Join thousands of users who trust SunGuard for their daily sun safety.</p>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-white text-[#155dfc] px-10 py-4 rounded-full text-[18px] font-bold hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
                >
                  Create Free Account <ChevronRight size={20} />
                </Link>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Sun className="text-orange-400" size={24} strokeWidth={2} />
            <span className="text-xl font-bold tracking-tight">SunGuard</span>
          </div>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} SunGuard App. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
