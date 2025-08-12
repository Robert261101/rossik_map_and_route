import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";

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

const HEADER_LOGO = "/Rossik_Tools-removebg-preview.png";

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

  // reuse one button style everywhere in the header
const btnWhiteRed =
  "text-[#a82424] bg-white border border-[#a82424]/30 " +
  "hover:bg-white/90 hover:border-[#a82424] " +
  "px-4 py-2 rounded-full text-base font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#a82424]/40";


export default function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const path = location.pathname;
  const accents = PAGE_ACCENTS[path] || PAGE_ACCENTS["/"];
  const isLanding = path === "/";


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
      {/* Solid brand red bar (no gradient) */}
      <div className="w-full bg-[#a82424] shadow-lg">
        <div className="relative w-full">
          <div className="bg-transparent rounded-none px-3 sm:px-4 md:px-6 py-3 md:py-4 w-full">

            {/* optional fade edges keep as-is */}
            {/* <div className="pointer-events-none absolute inset-0 flex justify-between">
              <div className="w-8 bg-gradient-to-r from-[rgba(255,255,255,0.3)] to-transparent"></div>
              <div className="w-8 bg-gradient-to-l from-[rgba(255,255,255,0.3)] to-transparent"></div>
            </div> */}

            <div className="flex items-center justify-between gap-3">
              {/* LEFT: Logo (hidden on landing) */}
              <div className="flex items-center gap-30 min-w-0">
                  <Link to="/" className="shrink-0">
                    <img
                      src={HEADER_LOGO}
                      alt="Rossik Tools"
                      className="h-10 md:h-16 object-contain drop-shadow cursor-pointer"
                    />
                  </Link>
              </div>


              {/* RIGHT: Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 relative">
                {/* Example: Admin */}
                {user?.role === "admin" && (
                  <button onClick={() => navigate("/admin")} className={btnWhiteRed}>
                    Admin Panel
                  </button>
                )}

                {(user?.role === "admin" || user?.role === "team_lead") && (
                  <button onClick={() => navigate("/admin/teams")} className={btnWhiteRed}>
                    Teams
                  </button>
                )}

                {/* Tools dropdown trigger now white/red */}
                <div className="relative">
                  <button
                    onClick={() => setToolsOpen(p => !p)}
                    className={cn(btnWhiteRed, "flex items-center")}
                    aria-haspopup="menu"
                    aria-expanded={toolsOpen}
                  >
                    Tools
                    <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", toolsOpen ? "rotate-0" : "-rotate-90")} />
                  </button>

                  {toolsOpen && (
                    <div className="absolute top-full right-0 mt-2 w-52 rounded-xl border border-white/30 bg-white/95 backdrop-blur shadow-xl overflow-hidden z-50">
                      <button onClick={() => { navigate('/spotgo'); setToolsOpen(false); }} className="block w-full text-left px-4 py-2.5 hover:bg-black/5 text-[#111]">
                        SpotGo
                      </button>
                      <button onClick={() => { navigate('/map-and-guide'); setToolsOpen(false); }} className="block w-full text-left px-4 py-2.5 hover:bg-black/5 text-[#111]">
                        Map and Guide
                      </button>
                    </div>
                  )}
                </div>

                {/* Logout */}
                <button onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem("token"); navigate("/login"); }} className={btnWhiteRed}>
                  Logout
                </button>

                {/* Username */}
                <div className="hidden md:block text-lg font-semibold text-white/95 ml-1">
                  {/* keep white here for contrast over red */}
                  {(() => {
                    const email = user?.email || "";
                    const local = email.split("@")[0] || "";
                    return local.split(".").map(p => p[0]?.toUpperCase() + p.slice(1)).join(" ");
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </header>
  );
}
