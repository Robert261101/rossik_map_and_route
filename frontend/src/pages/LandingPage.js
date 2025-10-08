// src/RossikTools.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import { Workflow } from 'lucide-react';

const tiles = [
  { label: 'Map & Guide', to: '/map-and-guide', img: '/Map_and_Guide_Logo.png', alt: 'Map & Guide' },
  { label: 'SpotGo',      to: '/spotgo',        img: '/Spot_Go_Logo.png',       alt: 'SpotGo' },
  { label: 'Trucks',      to: '/spotgotrucks',  img: null,                      alt: 'Trucks' },
  { label: 'Transporeon', to: null,             img: null,                      alt: 'Transporeon' },
];

export default function RossikTools({ user }) {
  const navigate = useNavigate();

  const Box = ({ to, img, alt, label }) => {
    const hasNav = Boolean(to);
    const open = () => { if (hasNav) navigate(to); };
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    };

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${hasNav ? 'Open' : 'Tile'} ${label}`}
        onClick={open}
        onKeyDown={onKey}
        className="
          group relative cursor-pointer rounded-2xl overflow-hidden shadow-2xl
          transition-transform duration-300 hover:scale-[1.02] active:scale-95
          focus:outline-none focus:ring-2 focus:ring-emerald-500
          w-[260px] sm:w-[500px] mx-auto
          border border-gray-200 dark:border-gray-700
          bg-white/90 dark:bg-gray-800/70 backdrop-blur
        "
      >
        {img ? (
          <>
            {/* Full-bleed image fills the “box” */}
            <img
              src={img}
              alt={alt}
              className="w-full object-cover select-none pointer-events-none"
              draggable="false"
              loading="eager"
              decoding="async"
            />
            <span className="sr-only">{label}</span>
          </>
        ) : (
          // Fallback panel when there’s no image
          <div
            className="
              flex items-center justify-center h-[140px] sm:h-[220px]
              bg-white dark:bg-gray-800/70
            "
          >
            <span className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
              {label}
            </span>
          </div>
        )}

        {!hasNav && (
          <div className="absolute top-3 right-3">
            <span
              className="
                inline-flex items-center rounded-full
                bg-amber-500/90 text-white text-xs font-semibold px-3 py-1 shadow
              "
            >
              Coming soon
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="
        min-h-screen
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
        dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
      "
    >
      <Header user={user} />

      <main className="py-12 px-6 max-w-7xl mx-auto">
        <h1 className="sr-only">Rossik Tools</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          {tiles.map((t) => (
            <Box key={t.label} {...t} />
          ))}
        </div>
      </main>

      {/* subtle dot grid background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="
            w-full h-full
            bg-[radial-gradient(#ffffff33_1px,transparent_1px)]
            dark:bg-[radial-gradient(#374151_1px,transparent_1px)]
            bg-[length:20px_20px] opacity-20
          "
        />
      </div>
    </div>
  );
}
