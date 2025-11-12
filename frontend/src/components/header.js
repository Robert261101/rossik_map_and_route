import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Menu, X, LogOut, Wrench, Shield, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

// tiny cn util
function cn(...xs) { return xs.filter(Boolean).join(" "); }

const HEADER_LOGO = "/Rossik_Tools-removebg-preview.png";

const btnHeader =
  "px-4 py-2 rounded-full text-base font-semibold shadow " +
  "bg-white text-[#a82424] border border-white/40 hover:bg-white/90 " +
  "focus:outline-none focus:ring-2 focus:ring-[#a82424]/40 " +
  "dark:bg-gray-700 dark:text-white dark:border-gray-600 " +
  "dark:hover:bg-gray-600 dark:focus:ring-gray-400";

const dropdownPanel =
  "absolute top-full right-0 mt-2 w-52 rounded-xl overflow-hidden z-50 shadow-xl " +
  // LIGHT
  "bg-white/95 text-[#111] border border-black/10 " +
  // DARK
  "dark:bg-gray-800/95 dark:text-gray-100 dark:border-white/10";

export default function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // close menus on route change
  React.useEffect(() => { setToolsOpen(false); setMobileOpen(false); }, [location.pathname]);

  // close dropdown on ESC / click outside
  const dropRef = React.useRef(null);
  React.useEffect(() => {
    function onKey(e) { if (e.key === "Escape") { setToolsOpen(false); setMobileOpen(false); } }
    function onClick(e) { if (toolsOpen && dropRef.current && !dropRef.current.contains(e.target)) setToolsOpen(false); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onClick); };
  }, [toolsOpen]);

  const mobileItem =
    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left " +
    "transition focus:outline-none focus:ring-2 focus:ring-[#a82424]/30 " +
    // light
    "hover:bg-gray-200 " +
    // dark
    "dark:bg-gray-800/60 dark:hover:bg-gray-700/70";


  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    navigate("/login");
  };
  const handleSpotGo = () => navigate("/spotgo", { state: {} });
  const handleMapGuide = () => navigate("/map-and-guide", { state: { fromMapGuide: true } });
  const handleHistory = () => navigate("/history", { state: { fromHistory: true } });
  const handleConversations = () => navigate("/conversations", { state: {} });
  const handleAdmin = () => navigate("/admin");
  const handleTeams = () => navigate("/admin/teams");

  const userDisplay = React.useMemo(() => {
    const email = user?.email || "";
    const local = email.split("@")[0] || "";
    return local.split(".").map((p) => p[0]?.toUpperCase() + p.slice(1)).join(" ");
  }, [user]);

  return (
    <header className="sticky top-[env(safe-area-inset-top)] z-50">
      <div className="w-full bg-[#a82424] dark:bg-gray-900 shadow-lg">
        {/* BAR */}
        <div className="px-3 sm:px-4 md:px-6 py-2.5 md:py-3">
          <div className="flex items-center justify-between gap-3">
            {/* LEFT: Logo */}
            <Link to="/" className="shrink-0">
              <img
                src={HEADER_LOGO}
                alt="Rossik Tools"
                className="h-10 md:h-14 object-contain drop-shadow"
              />
            </Link>

            {/* RIGHT: Desktop buttons */}
            <div className="hidden md:flex items-center gap-2 sm:gap-3 relative">
              {user?.role === "admin" && (
                <button onClick={handleAdmin} className={btnHeader}>
                  Admin Panel
                </button>
              )}
              {(user?.role === "admin" || user?.role === "team_lead") && (
                <button onClick={handleTeams} className={btnHeader}>
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
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setToolsOpen(p => !p)}
                  className={cn(btnHeader, "flex items-center")}
                  aria-haspopup="menu"
                  aria-expanded={toolsOpen}
                >
                  Tools
                  <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", toolsOpen ? "rotate-0" : "-rotate-90")} />
                </button>

                {toolsOpen && (
                  <div className={dropdownPanel} role="menu">
                    <button
                      onClick={handleSpotGo}
                      className="block w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5"
                      role="menuitem"
                    >
                      SpotGo
                    </button>
                    <button
                      onClick={handleMapGuide}
                      className="block w-full text-left px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5"
                      role="menuitem"
                    >
                      Map &amp; Guide
                    </button>
                  </div>
                )}
              </div>

              <button onClick={handleLogout} className={btnHeader}>
                Logout
              </button>

              <div className="text-lg font-semibold text-white ml-1 truncate max-w-[16ch]">
                {userDisplay}
              </div>
            </div>

            {/* RIGHT: Mobile hamburger */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileOpen(true)}
                className="h-11 w-11 rounded-xl bg-white/95 text-[#a82424] dark:bg-gray-700 dark:text-white border border-white/30 dark:border-gray-600 flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE SHEET */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            {/* dim */}
            <button
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            {/* panel */}
              <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm
                  bg-white/95 dark:bg-gray-900/95 backdrop-blur-md
                  text-gray-900 dark:text-gray-100
                  shadow-2xl p-4 pt-5 flex flex-col border-l border-black/10 dark:border-white/10">

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src={HEADER_LOGO} alt="" className="h-8 object-contain" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{userDisplay}</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-10 w-10 rounded-lg flex items-center justify-center border border-black/10 dark:border-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-2 flex-1 overflow-y-auto">
                <ul className="space-y-1">
                  {user?.role === "admin" && (
                    <li>
                      <button onClick={handleAdmin} className={mobileItem}>
                        <Shield className="h-4 w-4" /> Admin Panel
                      </button>
                    </li>
                  )}
                  {(user?.role === "admin" || user?.role === "team_lead") && (
                    <li>
                      <button onClick={handleTeams} className={mobileItem}>
                        <Users className="h-4 w-4" /> Teams
                      </button>
                    </li>
                  )}
                  <li className="pt-2">
                    <div className="px-3 pb-1 text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">Tools</div>
                    <div className="flex flex-col gap-2">
                    <button onClick={handleSpotGo} className={mobileItem}>
                      <Wrench className="h-4 w-4" /> SpotGo
                    </button>
                    <button onClick={handleMapGuide} className={mobileItem}>
                      <Wrench className="h-4 w-4" /> Map &amp; Guide
                    </button>
                    </div>
                  </li>
                </ul>
              </nav>

              <div className="pt-2 border-t border-black/10 dark:border-white/10">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#a82424] text-white font-semibold hover:brightness-110">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
