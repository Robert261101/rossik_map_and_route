import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

export default function AddTruck({ user }) {
  const [plate, setPlate] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [euroPerKm, setEuroPerKm] = useState(''); // user-entered or blank
  const [pricePerDay, setPricePerDay] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) console.error('Error loading teams:', error);
      else setTeams(data || []);
    })();
  }, []);

  function normalizePlate(raw) {
    if (typeof raw !== 'string') return '';
    const groups = raw.toUpperCase().match(/[A-Z]+|\d+/g);
    return groups ? groups.join(' ') : raw.toUpperCase();
  }

  const handleSubmit = async () => {
    if (!plate || !selectedTeam) {
      alert('Complete necesarry fields');
      return;
    }

    const cleanPlate = normalizePlate(plate);

    // fallback to default 0.1 if user left blank or invalid
    const rate = typeof euroPerKm === 'number' ? euroPerKm : 0.1;

    const { data: { session } = {} } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch('/api/admin/trucks/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plate: cleanPlate,
        team_id: selectedTeam,
        euro_per_km: rate,
        price_per_day: pricePerDay === '' ? null : pricePerDay
      }),
    });

    if (res.ok) {
      alert('Camion adăugat cu succes');
      navigate('/admin');
    } else {
      const err = await res.json().catch(() => ({}));
      alert('Eroare: ' + (err.error || 'Unknown'));
    }
  };

  return (
    <div
      className="
        min-h-screen transition-colors
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-900
        dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
      "
    >
      <Header user={user} />

      <div
        className="
          p-6 max-w-xl mx-auto mt-10
          bg-white/80 dark:bg-gray-800/70
          border border-gray-200 dark:border-gray-700
          backdrop-blur-md rounded-xl shadow-xl
        "
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">Add Truck</h1>

        <input
          type="text"
          value={plate}
          onChange={e => setPlate(e.target.value)}
          placeholder="Plate Number"
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
        />

        <input
          type="number"
          step="0.1"
          value={euroPerKm === '' ? '' : euroPerKm}
          placeholder="Euro/km (0.10 - default)"
          onChange={e => {
            const raw = e.target.value.replace(',', '.');
            const num = parseFloat(raw);
            setEuroPerKm(isNaN(num) ? '' : num);
          }}
          onBlur={() => euroPerKm === '' && setEuroPerKm('')}
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
        />

        <input
          type="number"
          step="1"
          value={pricePerDay === '' ? '' : pricePerDay}
          placeholder="Price per Day"
          onChange={e => {
            const raw = e.target.value.replace(',', '.');
            const num = parseFloat(raw);
            setPricePerDay(isNaN(num) ? '' : num);
          }}
          onBlur={() => pricePerDay === '' && setPricePerDay('')}
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
        />

        <select
          className="
            w-full p-3 mb-6 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
        >
          <option value="">Select Team</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button
          onClick={handleSubmit}
          className="
            w-full py-3 rounded-full font-semibold shadow-md transition
            bg-gradient-to-r from-green-500 to-green-700 text-white
            hover:from-green-600 hover:to-green-800
            focus:outline-none focus:ring-2 focus:ring-green-400/60
          "
        >
          Add
        </button>
      </div>
    </div>
  );
}
