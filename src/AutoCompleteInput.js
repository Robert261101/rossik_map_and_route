import React, { useState, useEffect, useRef } from 'react';

const AutoCompleteInput = ({ apiKey, onSelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length > 2) {
        const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(query)}&apiKey=${apiKey}`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          if (data.items) setSuggestions(data.items);
        } catch (error) {
          console.error('Eroare:', error);
        }
      } else {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [query, apiKey]);

  const fetchCoordinates = async (address) => {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&apiKey=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.items && data.items.length > 0) return data.items[0].position;
    } catch (error) {
      console.error('Eroare:', error);
    }
    return null;
  };

  const handleSelect = async (suggestion) => {
    if (!suggestion || !suggestion.address) return;
    let lat = suggestion.position ? suggestion.position.lat : null;
    let lng = suggestion.position ? suggestion.position.lng : null;
    if (lat === null || lng === null) {
      const position = await fetchCoordinates(suggestion.address.label);
      if (position) {
        lat = position.lat;
        lng = position.lng;
      } else return;
    }
    setQuery(suggestion.address.label);
    setSuggestions([]);
    onSelect({ lat, lng });
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Introdu adresa sau codul poștal"
      />
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(suggestion);
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
            >
              {suggestion.address.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutoCompleteInput;
