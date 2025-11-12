import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';

const tiles = [
  { label: 'Map & Guide', to: '/map-and-guide', img: '/Map_and_Guide_Logo.png', alt: 'Map & Guide' },
  { label: 'SpotGo',      to: '/spotgo',        img: '/Spot_Go_Logo.png',       alt: 'SpotGo' },
  { label: 'Trucks',      to: '/spotgotrucks',  img: null,                      alt: 'Trucks' },
  { label: 'Transporeon', to: null,             img: null,                      alt: 'Transporeon' },
];

function useMediaQuery(query) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return; // SSR safety
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange(); // set initial
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Tailwind: sm starts at 640px → “mobile” is < 640px
export function useIsMobile() {
  return useMediaQuery("(max-width: 639px)");
}


export default function RossikTools({ user }) {
  const navigate = useNavigate();

  const Box = ({ to, img, alt, label }) => {
    const isMobile = useIsMobile();
    const hasNav = Boolean(to);
    const open = () => { if (hasNav) navigate(to); };
    const Base = hasNav ? 'button' : 'div';

    return (
      <Base
        onClick={open}
        aria-label={`${hasNav ? 'Open' : 'Tile'} ${label}`}
        className="
          group relative rounded-2xl overflow-hidden shadow-2xl
          transition-transform duration-300
          hover:scale-[1.01] active:scale-[0.98] transform-gpu will-change-transform
          focus:outline-none focus:ring-2 focus:ring-emerald-500
          w-full
          border border-gray-200 dark:border-gray-700
          bg-white/90 dark:bg-gray-800/70
        "
      >
        <div className="aspect-[16/9] sm:aspect-[2/1]">
          {img ? (
            <img
              src={img}
              alt={alt}
              className={`h-full w-full block ${isMobile ? "object-cover" : "object-cover"} select-none pointer-events-none`}
              draggable="false"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                {label}
              </span>
            </div>
          )}
        </div>

        {!hasNav && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-full bg-amber-500/90 text-white text-xs font-semibold px-3 py-1 shadow">
              Coming soon
            </span>
          </div>
        )}
      </Base>
    );
  };

  return (
    <div
      className="
        min-h-dvh
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
        dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
      "
    >
      <Header user={user} />

      <main className="py-8 sm:py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <h1 className="sr-only">Rossik Tools</h1>

        <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2">
          {tiles.map((t) => (
            <Box key={t.label} {...t} />
          ))}
        </div>
      </main>

      <div className="fixed inset-0 -z-10 pointer-events-none hidden sm:block">
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
