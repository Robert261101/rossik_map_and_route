// Enhanced AutoCompleteInput with full geocoding fallback
import React, { useState, useEffect, useRef } from 'react';

const AutoCompleteInput = ({ apiKey, onSelect, className }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!apiKey || query.length < 3) return;
    setLoading(true);
    try {
      const url = `https://autocomplete.search.hereapi.com/v1/autocomplete?q=${encodeURIComponent(query)}&apiKey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      const itemsWithPostal = data.items?.filter(it => it.address && it.address.label);
      setSuggestions(itemsWithPostal || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFullAddressFromLabel = async (label) => {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(label)}&apiKey=${apiKey}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.items?.[0]?.address || null;
    } catch (err) {
      console.error('Geocoding failed:', err);
      return null;
    }
  };

  const fetchRandomPostalFromCity = async (city, countryCode) => {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(city + ', ' + countryCode)}&apiKey=${apiKey}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const candidates = data.items?.filter(i => i.address?.postalCode);
      if (candidates?.length > 0) {
        const randIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randIndex].address.postalCode;
      }
    } catch (err) {
      console.error("Fallback postal fetch failed:", err);
    }
    return null;
  };

  const handleSelect = async (suggestion) => {
    if (!suggestion || !suggestion.address) return;
    let address = suggestion.address;
    let lat = suggestion.position?.lat;
    let lng = suggestion.position?.lng;

    if (!address.postalCode || !address.countryCode || address.countryCode.length !== 2) {
      const fullAddr = await fetchFullAddressFromLabel(address.label);
      if (fullAddr) {
        address = { ...address, ...fullAddr };
      }
    }

    // 🔁 Fallback to random postal code if still missing
    if (!address.postalCode && address.city && address.countryCode?.length === 2) {
      const fallbackPostal = await fetchRandomPostalFromCity(address.city, address.countryCode);
      if (fallbackPostal) address.postalCode = fallbackPostal;
    }

    if (!lat || !lng) {
      const coords = suggestion.position || (await fetchCoordinates(address.label));
      lat = coords?.lat;
      lng = coords?.lng;
    }

    if (!lat || !lng) return;

    setSelectedAddress(address.label);
    setQuery('');
    setSuggestions([]);
    if (inputRef.current) inputRef.current.blur();

    onSelect({
      label: address.label,
      city: address.city || '',
      postalCode: address.postalCode || '',
      countryCode: address.countryCode || '',
      lat,
      lng
    });
  };

  const fetchCoordinates = async (address) => {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&apiKey=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.items?.[0]?.position || null;
    } catch (error) {
      console.error('Coordinate fetch error:', error);
      return null;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        ref={inputRef}
        value={selectedAddress || query}
        onKeyDown={handleKeyDown}
        onFocus={() => selectedAddress && setSelectedAddress(null)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter address or postal code"
        className="w-full border-2 border-indigo-300 rounded p-2 shadow-sm transition focus-within:ring-2 focus-within:ring-indigo-300 focus:outline-none border-none"
      />
      {loading && (
        <div style={{ position: 'absolute', top: '100%', left: 0 }}>Loading...</div>
      )}
      {suggestions.length > 0 && !selectedAddress && (
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
      )}
    </div>
  );
};

export default AutoCompleteInput;
