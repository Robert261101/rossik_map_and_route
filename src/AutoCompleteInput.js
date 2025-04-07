import React, { useState, useEffect, useRef } from 'react';

const AutoCompleteInput = ({ apiKey, onSelect }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null); // Starea pentru adresa selectată
    const inputRef = useRef(null);

    // Funcția care se ocupă de căutarea sugestiilor
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.length > 2 && apiKey) {
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

    // Funcția care recuperează coordonatele adresei selectate
    const fetchCoordinates = async (address) => {
        setLoading(true);
        const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&apiKey=${apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.items && data.items.length > 0) return data.items[0].position;
        } catch (error) {
            console.error('Eroare:', error);
        } finally {
            setLoading(false);
        }
        return null;
    };

    // Funcția de selectare a adresei din lista de sugestii
    const handleSelect = async (suggestion) => {
        if (!suggestion || !suggestion.address) return;

        // Preia coordonatele dacă sunt deja disponibile sau le caută pe baza adresei
        let lat = suggestion.position ? suggestion.position.lat : null;
        let lng = suggestion.position ? suggestion.position.lng : null;

        if (lat === null || lng === null) {
            const position = await fetchCoordinates(suggestion.address.label);
            if (position) {
                lat = position.lat;
                lng = position.lng;
            } else return;
        }

        // Actualizează starea pentru adresa selectată
        setSelectedAddress(suggestion.address.label);
        setQuery(suggestion.address.label); // Actualizează input-ul cu adresa selectată
        setSuggestions([]); // Golește lista de sugestii după selecție
        inputRef.current?.blur(); // Pierde focusul pentru input
        onSelect({ lat, lng, label: suggestion.address.label });
    };

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                ref={inputRef}
                value={selectedAddress || query} // Afișează adresa selectată sau query-ul curent
                onChange={(e) => {
                    if (!selectedAddress) {
                        setQuery(e.target.value); // Actualizează query-ul doar dacă nu este selectată o adresă
                    }
                }}
                placeholder="Introdu adresa sau codul poștal"
            />
            {loading && <div style={{ position: 'absolute', top: '100%', left: 0 }}>Loading...</div>}
            {suggestions.length > 0 && !selectedAddress && ( // Afișează sugestiile doar dacă nu este selectată o adresă
                <ul style={{ position: 'absolute', top: '100%', left: 0, background: 'white', listStyle: 'none', padding: '5px', margin: 0, border: '1px solid #ccc', width: '100%', zIndex: 999 }}>
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(suggestion)} // Utilizează direct handleSelect pentru a alege adresa
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