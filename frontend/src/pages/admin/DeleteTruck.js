// src/pages/admin/DeleteTruck.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function DeleteTruck({ user }) {
  const [trucks, setTrucks] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/trucks', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const trucks = await res.json();
        setTrucks(trucks);
      } else {
        console.error('Eroare la încărcarea camioanelor');
      }
    })();
  }, []);


  const handleDelete = async () => {
    if (!selectedTruckId) return alert('Selectează un camion');

    const confirmDelete = window.confirm('Ești sigur că vrei să ștergi camionul?');
    if (!confirmDelete) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/admin/truck/${selectedTruckId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (res.ok) {
      alert('Camion șters cu succes');
      setTrucks(prev => prev.filter(t => t.id !== selectedTruckId));
      setSelectedTruckId('');
    } else {
      const err = await res.json();
      alert('Eroare la ștergere: ' + err.error);
      console.error('Backend error:', err);
    }
  };


  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Șterge Camion</h1>
      <select
        className="w-full p-2 border mb-4"
        value={selectedTruckId}
        onChange={e => setSelectedTruckId(e.target.value)} // <--- actualizezi corect
      >
        <option value="">Selectează un camion</option>
        {trucks.map(t => (
          <option key={t.id} value={t.id}>{t.plate}</option>
        ))}
      </select>
      <button
        onClick={handleDelete}
        className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
      >
        Șterge camionul
      </button>
    </div>
  );
}
