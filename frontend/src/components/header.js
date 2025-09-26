import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";

// tiny cn util
function cn(...xs) { return xs.filter(Boolean).join(" "); }

const HEADER_LOGO = "/Rossik_Tools-removebg-preview.png";

// Light vs dark button styles in one class
// Light: white pill with red text
// Dark: gray pill with white text
const btnHeader =
  // light
  "px-4 py-2 rounded-full text-base font-semibold shadow " +
  "bg-white text-[#a82424] border border-white/40 hover:bg-white/90 " +
  "focus:outline-none focus:ring-2 focus:ring-[#a82424]/40 " +
  // dark
  "dark:bg-gray-700 dark:text-white dark:border-gray-600 " +
  "dark:hover:bg-gray-600 dark:focus:ring-gray-400";

const dropdownPanel =
  "absolute top-full right-0 mt-2 w-52 rounded-xl overflow-hidden z-50 backdrop-blur shadow-xl " +
  // light
  "bg-white/95 text-[#111] border border-white/30 " +
  // dark
  "dark:bg-gray-900/95 dark:text-gray-100 dark:border-gray-700";

export default function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = React.useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleSpotGo = () => { navigate("/spotgo", { state: {} }); setToolsOpen(false); };
  const handleMapGuide = () => { navigate("/map-and-guide", { state: { fromMapGuide: true } }); setToolsOpen(false); };
  const handleHistory = () => { navigate("/history", { state: { fromHistory: true } }); setToolsOpen(false); };
  const handleConversations = () => { navigate("/conversations", { state: {} }); setToolsOpen(false); };

  return (
    <header className="sticky top-0 z-50">
      {/* Light: brand red | Dark: neutral gray */}
      <div className="w-full bg-[#a82424] dark:bg-gray-900 shadow-lg">
        <div className="relative w-full">
          <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4 w-full">
            <div className="flex items-center justify-between gap-3">
              {/* LEFT: Logo */}
              <div className="flex items-center gap-30 min-w-0">
                <Link to="/" className="shrink-0">
                  <img
                    src={HEADER_LOGO}
                    alt="Rossik Tools"
                    className="h-10 md:h-16 object-contain drop-shadow cursor-pointer"
                  />
                </Link>
              </div>

              {/* RIGHT: Actions */}
              <div className="flex items-center gap-2 sm:gap-3 relative">
                {user?.role === "admin" && (
                  <button onClick={() => navigate("/admin")} className={btnHeader}>
                    Admin Panel
                  </button>
                )}

                {(user?.role === "admin" || user?.role === "team_lead") && (
                  <button onClick={() => navigate("/admin/teams")} className={btnHeader}>
                    Teams
                  </button>
                )}

                <button onClick={handleConversations} className={btnHeader}>
                  Conversations
                </button>

                <button onClick={handleHistory} className={btnHeader}>
                  History
                </button>

                {/* Tools dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setToolsOpen(p => !p)}
                    className={cn(btnHeader, "flex items-center")}
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
                    <div className={dropdownPanel}>
                      <button
                        onClick={handleSpotGo}
                        className="block w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        SpotGo
                      </button>
                      <button
                        onClick={handleMapGuide}
                        className="block w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        Map and Guide
                      </button>
                    </div>
                  )}
                </div>

                {/* Logout */}
                <button onClick={handleLogout} className={btnHeader}>
                  Logout
                </button>

                {/* Username: white in both (reads on red & gray) */}
                <div className="hidden md:block text-lg font-semibold text-white ml-1">
                  {(() => {
                    const email = user?.email || "";
                    const local = email.split("@")[0] || "";
                    return local
                      .split(".")
                      .map((p) => p[0]?.toUpperCase() + p.slice(1))
                      .join(" ");
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
