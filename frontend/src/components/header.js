// src/components/Header.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import { supabase } from '../lib/supabase';
import RossikLogo from '../VektorLogo_Rossik_rot.gif';

export default function Header({ user }) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = React.useState(false);

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

  return (
    <header className="top-0 z-50">
      <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
        {/* LEFT: Logo */}
        <div className="flex items-center">
          <Link to="/">
            <img src={RossikLogo} alt="Rossik Logo" className="h-12 object-contain cursor-pointer" />
          </Link>
        </div>

        {/* RIGHT: Buttons */}
        <div className="flex items-center space-x-3">
          {/* Dark mode toggle (optional) */}
          {/*
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded hover:bg-white/40 dark:hover:bg-gray-700"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button>
          */}

          <button
            onClick={() => navigate('/spotgo')}
            className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
          >
            SpotGo
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Admin Panel
            </button>
          )}

          {(user?.role === 'admin' || user?.role === 'team_lead') && (
            <button
              onClick={() => navigate('/admin/teams')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Teams
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
          >
            Main Page
          </button>

          <button
            onClick={() => navigate('/history')}
            className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
          >
            History
          </button>

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
        </div>
      </div>
    </header>
  );
}