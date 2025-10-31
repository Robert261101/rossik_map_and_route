// Enhanced AutoCompleteInput with full geocoding fallback
import React, { useState, useEffect, useRef } from 'react';

const AutoCompleteInput = ({ apiKey, onSelect, className, value}) => {
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

  useEffect(() => {
    if (value?.label) {
      setSelectedAddress(value.label);
      setQuery(value.label);
    }
  }, [value]);


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
        onFocus={() => selectedAddress && setSelectedAddress(null)} // setSelectedAddress(null) face ca sa dispara adresa imediat ce dau click pe textbox dupa ce am o adresa selectata
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter address or postal code"
        className={`
          w-full rounded p-2 shadow-sm transition
          focus:ring-2 focus:ring-indigo-300 focus:outline-none
          bg-gray-50 dark:bg-gray-700
          text-gray-900 dark:text-gray-100
          placeholder-gray-500 dark:placeholder-gray-400
          border-none
          ${className || ''}
        `}
      />
      {loading && (
        <div style={{ position: 'absolute', top: '100%', left: 0 }}>Loading...</div>
      )}
      {suggestions.length > 0 && !selectedAddress && (
  <ul
    role="listbox"
    className="
      absolute left-0 top-full mt-1 w-full z-50
      max-h-64 overflow-y-auto
      rounded-lg overflow-hidden
      border border-gray-200 dark:border-gray-700
      bg-white dark:bg-gray-800
      text-gray-900 dark:text-gray-100
      shadow-xl
      divide-y divide-gray-100 dark:divide-gray-700
    "
  >
    {suggestions.map((s, i) => (
      <li
        key={i}
        role="option"
        onClick={() => handleSelect(s)}
        className="
          px-3 py-2 cursor-pointer select-none
          hover:bg-red-50 dark:hover:bg-gray-700
          focus:bg-red-50 dark:focus:bg-gray-700
        "
      >
        {s.address?.label || s.title}
      </li>
    ))}
  </ul>
)}

    </div>
  );
};

export default AutoCompleteInput;
