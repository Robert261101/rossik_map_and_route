// src/pages/admin/AddTruck.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AddTruck({ user }) {
  const [plate, setPlate] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('teams').select('id, name');
      if (error) console.error('Eroare la încărcarea echipelor:', error);
      else setTeams(data);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!plate || !selectedTeam) return alert('Completează toate câmpurile');

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch('/api/admin/truck/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plate, team_id: selectedTeam })
    });

    if (res.ok) {
      alert('Camion adăugat cu succes');
      navigate('/admin');
    } else {
      const err = await res.json();
      alert('Eroare: ' + err.error);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Adaugă Camion</h1>
      <input
        type="text"
        value={plate}
        onChange={e => setPlate(e.target.value)}
        placeholder="Număr înmatriculare"
        className="w-full p-2 border mb-4"
      />
      <select
        className="w-full p-2 border mb-4"
        value={selectedTeam}
        onChange={e => setSelectedTeam(e.target.value)}
      >
        <option value="">Selectează echipa</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <button
        onClick={handleSubmit}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Adaugă
      </button>
    </div>
  );
}
