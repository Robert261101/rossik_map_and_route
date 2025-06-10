import React, { useState, useEffect, useRef } from 'react';

const AutoCompleteInput = ({ apiKey, onSelect, className }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // handler care face fetch doar când apeși Enter
  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();              // nu lasă form-ul să trimită
    if (!apiKey || query.length < 3) return;
    setLoading(true);
    try {
      const url = `https://autocomplete.search.hereapi.com/v1/autocomplete`
        + `?q=${encodeURIComponent(query)}&apiKey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

    setSelectedAddress(suggestion.address.label); // Salvează adresa selectată
    setQuery('');
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.blur();
    }
    onSelect({ lat, lng, label: suggestion.address.label });
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        ref={inputRef}
        value={query}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Permite modificarea adresei: resetează selectedAddress doar la focus
          if (selectedAddress) {
            setSelectedAddress(null);
          }
        }}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        placeholder="Enter address or postal code"
        className="w-full border-2 border-indigo-300 rounded p-2 shadow-sm transition focus-within:ring-2 focus-within:ring-indigo-300 focus:outline-none border-none"
      />
      {loading ? (
        <div style={{ position: 'absolute', top: '100%', left: 0 }}>
          Loading...
        </div>
      ) : null}

      {suggestions.length > 0 && !selectedAddress ? (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            background: 'white',
            listStyle: 'none',
            padding: '5px',
            margin: 0,
            border: '1px solid #ccc',
            width: '100%',
            zIndex: 999,
          }}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              style={{ cursor: 'pointer', padding: '5px 0' }}
            >
              {suggestion.address?.label || suggestion.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default AutoCompleteInput;
