// src/pages/admin/DeleteTruck.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

export default function DeleteTruck({ user }) {
  const [trucks, setTrucks] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } = {} } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/trucks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const trucks = await res.json();
        setTrucks(trucks || []);
      } else {
        console.error('Trucks loading error');
      }
    })();
  }, []);

  const handleDelete = async () => {
    if (!selectedTruckId) {
      alert('Select a truck');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this truck?');
    if (!confirmDelete) return;

    const { data: { session } = {} } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/admin/trucks/${selectedTruckId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      alert('Truck deleted succesfully');
      setTrucks(prev => prev.filter(t => t.id !== selectedTruckId));
      setSelectedTruckId('');
    } else {
      const err = await res.json().catch(() => ({}));
      alert('Delete Error: ' + (err.error || 'Unknown'));
      console.error('Backend error:', err);
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
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Delete Truck
        </h1>

        <select
          className="
            w-full p-3 mb-6 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={selectedTruckId}
          onChange={e => setSelectedTruckId(e.target.value)}
        >
          <option value="">Selectează un camion</option>
          {trucks.map(t => (
            <option key={t.id} value={t.id}>
              {t.plate}
            </option>
          ))}
        </select>

        <button
          onClick={handleDelete}
          className="
            w-full py-3 rounded-full font-semibold shadow-md transition
            bg-gradient-to-r from-red-600 to-red-800 text-white
            hover:from-red-700 hover:to-red-900
            focus:outline-none focus:ring-2 focus:ring-red-400/60
          "
        >
          Delete Truck
        </button>
      </div>
    </div>
  );
}
