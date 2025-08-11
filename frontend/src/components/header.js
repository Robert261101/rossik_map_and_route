import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";

const logoSrc = "/rossik_tools.png";


/**
 * Header modernizat pentru Rossik
 * - Păstrează: culorile, fonturile, ordinea butoanelor
 * - Îmbunătățește: vizual (sticlă/blur), umbre moi, accent per pagină, responsive
 * - Diferit pentru fiecare pagină (accente/gradient/badge activ)
 */

// Utilitar mic pt. className
function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Accente vizuale per pagină/route
const PAGE_ACCENTS = {
  "/": {
    bg: "from-[#e44] to-[#b31313]",
    ring: "ring-red-500/30",
    pill: "bg-white/80 text-red-700",
  },
  "/history": {
    bg: "from-[#e44] to-[#b31313]",
    ring: "ring-red-500/30",
    pill: "bg-white/90 text-red-700",
  },
  "/admin": {
    bg: "from-[#e44] to-[#b31313]",
    ring: "ring-red-500/30",
    pill: "bg-white/85 text-red-700",
  },
  "/admin/teams": {
    bg: "from-[#e44] to-[#b31313]",
    ring: "ring-red-500/30",
    pill: "bg-white/85 text-red-700",
  },
  "/spotgo": {
    bg: "from-[#e44] to-[#b31313]",
    ring: "ring-red-500/30",
    pill: "bg-white/85 text-red-700",
  },
};

export default function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const path = location.pathname;
  const accents = PAGE_ACCENTS[path] || PAGE_ACCENTS["/"];

  // Detect if we came via Map and Guide
  const isMapGuideView = path === "/" && location.state?.fromMapGuide;
  // Detect if we came via History
  const isHistoryView = path === "/history" && location.state?.fromHistory;

  const formatName = (email = "") => {
    if (!email.includes("@")) return "";
    const local = email.split("@")[0];
    return local
      .split(".")
      .map((p) => p[0]?.toUpperCase() + p.slice(1))
      .join(" ");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSpotGo = () => {
    navigate("/spotgo", { state: {} });
    setToolsOpen(false);
  };
  const handleMapGuide = () => {
    navigate('/map-and-guide', { state: { fromMapGuide: true } });
    setToolsOpen(false);
  };

  const handleHistory = () => {
    navigate('/history', { state: { fromHistory: true } });
    setToolsOpen(false);
  };
  
  // Titlu/pagină activă afişat subtil în dreapta
  const pageLabel = React.useMemo(() => {
    switch (path) {
      case "/":
        return "Map and Guide";
      case "/history":
        return "History";
      case "/admin":
        return "Admin Panel";
      case "/admin/teams":
        return "Teams";
      case "/spotgo":
        return "SpotGo";
      default:
        return "";
    }
  }, [path]);

  // Dropdown animat
  const dropdownVariants = {
    hidden: { opacity: 0, y: -4, pointerEvents: "none" },
    show: { opacity: 1, y: 0, pointerEvents: "auto" },
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Bandă gradient consistentă cu identitatea vizuală */}
      <div
        className={cn(
          "w-full",
          "bg-gradient-to-r", // culoarea rămâne roșie
          accents.bg,
          "shadow-lg"
        )}
      >
        <div className="relative w-full">
        {/* Card sticlă pe gradient (full width) */}
        <div
          className={cn(
            "backdrop-blur-xl supports-[backdrop-filter]:bg-white/20 bg-white/20", // blur și fundal alb mai puternic
            "rounded-none", // fără margini rotunjite pentru full-width
            "ring-1",
            accents.ring,
            "px-3 sm:px-4 md:px-6 py-3 md:py-4",
            "mt-0 mb-0 w-full"
          )}
        >
          {/* Fade-out pe laterale */}
          <div className="pointer-events-none absolute inset-0 flex justify-between">
            <div className="w-8 bg-gradient-to-r from-[rgba(255,255,255,0.3)] to-transparent"></div>
            <div className="w-8 bg-gradient-to-l from-[rgba(255,255,255,0.3)] to-transparent"></div>
          </div>

            <div className="flex items-center justify-between gap-3">
              {/* LEFT: Logo */}
              <div className="flex items-center gap-3 min-w-0">
                <Link to="/" className="shrink-0">
                  <img
                    src={logoSrc}
                    alt="Rossik Tools"
                    className="h-10 md:h-12 object-contain cursor-pointer drop-shadow"
                  />
                </Link>
              </div>

              {/* RIGHT: Buttons (ordinea se păstrează) */}
              <div className="flex items-center gap-2 sm:gap-3 relative">
                {isMapGuideView || isHistoryView ? (
                  <>
                    <button
                      onClick={handleMapGuide}
                      className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                    >
                      Map and Guide
                    </button>
                    <button
                      onClick={handleHistory}
                      className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                    >
                      History
                    </button>
                    <div className="hidden md:block text-lg font-semibold text-white/95 ml-1">
                      {formatName(user?.email)}
                    </div>
                  </>
                ) : (
                  <>
                    {user?.role === "admin" && (
                      <button
                        onClick={() => navigate("/admin")}
                        className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                      >
                        Admin Panel
                      </button>
                    )}

                    {(user?.role === "admin" || user?.role === "team_lead") && (
                      <button
                        onClick={() => navigate("/admin/teams")}
                        className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                      >
                        Teams
                      </button>
                    )}

                    {/* Tools dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setToolsOpen((p) => !p)}
                        className="flex items-center text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                        aria-haspopup="menu"
                        aria-expanded={toolsOpen}
                      >
                        Tools
                        <ChevronDown
                          className={cn(
                            "ml-2 h-4 w-4 transition-transform",
                            toolsOpen ? "rotate-0" : "-rotate-90"
                          )}
                        />
                      </button>
                        {toolsOpen && (
                          <div
                            className={`absolute top-full right-0 mt-2 w-52 rounded-xl border border-white/30 bg-white/90 backdrop-blur shadow-xl overflow-hidden z-50
                                      transition-all duration-200 ease-out transform origin-top ${toolsOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                          >
                            <button onClick={handleSpotGo} className="block w-full text-left px-4 py-2.5 hover:bg-black/5 text-gray-900">
                              SpotGo
                            </button>
                            <button onClick={handleMapGuide} className="block w-full text-left px-4 py-2.5 hover:bg-black/5 text-gray-900">
                              Map and Guide
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                    >
                      Logout
                    </button>

                    {/* Username + etichetă pagină */}
                    <div className="flex items-center gap-2 ml-1">
                      <div className="hidden md:block text-lg font-semibold text-white/95">
                        {formatName(user?.email)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
