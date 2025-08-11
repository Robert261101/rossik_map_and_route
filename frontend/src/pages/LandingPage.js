// src/pages/LandingPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import Map from 'lucide-react/dist/esm/icons/map';
import Compass from 'lucide-react/dist/esm/icons/compass';

export default function RossikTools({ user }) {
  const navigate = useNavigate();
  const [darkMode] = React.useState(false);

  // tweak these paths later when you wire routes
  const DESTS = {
    mapGuide: '/map-and-guide',
    spotGo: '/spotgo',
  };

  const Box = ({ label, to, Icon }) => {
    const open = () => navigate(to);

    return (
      <div
        onClick={open}
        className="relative cursor-pointer border border-white/30 bg-white/80 dark:bg-gray-800/30 backdrop-blur-md rounded-lg p-6 min-w-[280px] text-center shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:scale-[1.02] group"
      >
        <div className="absolute top-0 right-0 m-3 text-xs px-2 py-1 bg-emerald-500 text-white rounded-full shadow-sm">
          Active
        </div>
        <div className="flex justify-center mb-4">
          <Icon className="h-10 w-10 text-blue-500 group-hover:text-blue-600 transition duration-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{label}</h2>
        <div className="flex justify-center">
          <button
            onClick={(e) => { e.stopPropagation(); open(); }}
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
          >
            Open
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen top-0 z-50 transition-colors duration-500 ${
        darkMode
          ? 'bg-gray-900 text-white'
          : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'
      }`}
    >
      <Header user={user} />
      <main className="py-12 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-10 text-center">Rossik Tools</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-10">
          <Box label="Map & Guide" to={DESTS.mapGuide} Icon={Map} />
          <Box label="SpotGo" to={DESTS.spotGo} Icon={Compass} />
        </div>
      </main>

      {/* Background Particle Layer (same as AdminDashboard) */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(#ffffff33_1px,transparent_1px)] bg-[length:20px_20px] opacity-20"></div>
      </div>
    </div>
  );
}
