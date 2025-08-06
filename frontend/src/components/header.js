// src/components/Header.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import RossikLogo from '../VektorLogo_Rossik_rot.gif';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';

export default function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toolsOpen, setToolsOpen] = React.useState(false);

  // Detect if we came via Map and Guide
  const isMapGuideView =
    location.pathname === '/' && location.state?.fromMapGuide;

  // Detect if we came via History
  const isHistoryView =
    location.pathname === '/history' && location.state?.fromHistory;

  const formatName = (email = '') => {
    if (!email.includes('@')) return '';
    const local = email.split('@')[0];
    return local
      .split('.')
      .map(p => p[0]?.toUpperCase() + p.slice(1))
      .join(' ');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleTools = () => {
    setToolsOpen(prev => !prev);
  };

  const handleSpotGo = () => {
    navigate('/spotgo', { state: {} });
    setToolsOpen(false);
  };

  const handleMapGuide = () => {
    navigate('/', { state: { fromMapGuide: true } });
    setToolsOpen(false);
  };

  const handleHistory = () => {
    navigate('/history', { state: { fromHistory: true } });
    setToolsOpen(false);
  };

  return (
    <header className="top-0 z-50">
      <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
        {/* LEFT: Logo */}
        <div className="flex items-center">
          <Link to="/">
            <img
              src={RossikLogo}
              alt="Rossik Logo"
              className="h-12 object-contain cursor-pointer"
            />
          </Link>
        </div>

        {/* RIGHT: Buttons */}
        <div className="flex items-center space-x-3 relative">
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
              {/* Username formatted */}
              <div className="text-xl font-semibold ml-3">
                {formatName(user?.email)}
              </div>
            </>
          ) : (
            <>
              {/* Admin Panel */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                >
                  Admin Panel
                </button>
              )}

              {/* Teams */}
              {(user?.role === 'admin' || user?.role === 'team_lead') && (
                <button
                  onClick={() => navigate('/admin/teams')}
                  className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                >
                  Teams
                </button>
              )}

              {/* Tools dropdown */}
              <div className="relative">
                <button
                  onClick={toggleTools}
                  className="flex items-center text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                >
                  Tools
                  <ChevronDown
                    className={`ml-2 h-4 w-4 transform transition-transform ${
                      toolsOpen ? 'rotate-0' : 'rotate-90'
                    }`}
                  />
                </button>
                {toolsOpen && (
                  <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={handleSpotGo}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      SpotGo
                    </button>
                    <button
                      onClick={handleMapGuide}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
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

              {/* Username formatted */}
              <div className="text-xl font-semibold ml-3">
                {formatName(user?.email)}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
