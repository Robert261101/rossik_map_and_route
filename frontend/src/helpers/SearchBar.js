import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SearchBar({ savedRoutes }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialFilter = params.get('filter') || '';
  const [query, setQuery] = useState(initialFilter);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestionsRef = useRef(null);

  const normalize = str => str.toLowerCase().replace(/\s+/g, '');

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }
    const q = normalize(query);
    const filtered = savedRoutes.filter(route =>
      normalize(route.identifier).startsWith(q) ||
      normalize(route.truck_plate).startsWith(q)
    );
    setSuggestions(filtered.slice(0, 8));
    setActiveIndex(-1);
  }, [query, savedRoutes]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      const selected = suggestions[activeIndex];
      navigate(`/history?filter=${encodeURIComponent(selected.identifier)}`);
    } else {
      navigate(`/history?filter=${encodeURIComponent(query.trim())}`);
    }
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (e) => {
    if (!suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        setQuery(selected.identifier);
        navigate(`/history?filter=${encodeURIComponent(selected.identifier)}`);
        setSuggestions([]);
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const onSuggestionClick = (route) => {
    setQuery(route.identifier);
    setSuggestions([]);
    setActiveIndex(-1);
    navigate(`/history?filter=${encodeURIComponent(route.identifier)}`);
  };

  return (
    <form onSubmit={onSubmit} className="ml-4 relative w-72 flex items-center gap-x-3">
        <input
            type="search"
            placeholder="Filter History..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-grow px-2 py-1 border rounded text-lg"
            aria-autocomplete="list"
            aria-controls="search-suggestion-list"
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            autoComplete="off"
        />
        <button
            type="submit"
            className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
        >
            Search
        </button>

        {suggestions.length > 0 && (
            <ul
            id="search-suggestion-list"
            className="absolute z-50 mt-1 bg-white border rounded shadow max-h-60 overflow-auto w-60 left-0"
            role="listbox"
            ref={suggestionsRef}
            style={{ top: '100%' }}
            >
            {suggestions.map((route, i) => (
                <li
                key={route.id}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={activeIndex === i}
                className={`cursor-pointer px-3 py-1 hover:bg-red-100 ${
                    activeIndex === i ? 'bg-red-200' : ''
                }`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => onSuggestionClick(route)}
                >
                <span className="font-semibold">{route.identifier}</span> — {route.truck_plate}
                </li>
            ))}
            </ul>
        )}
    </form>


  );
}
