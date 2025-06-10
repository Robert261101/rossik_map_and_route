// src/pages/admin/AddUser.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AddUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState();
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const navigate = useNavigate();
  

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('teams').select('id, name');
      if (error) console.error('Eroare la încărcarea echipelor:', error);
      else setTeams(data);
    })();
  }, []);

  


  const handleAdd = async () => {

    if (!email || !password || !role || !teamId) {
      alert('Completează toate câmpurile!');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    console.log('Trimitem datele:', { email, password, role, team_id: teamId });
    
    const res = await fetch('/api/admin/user/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password, role, team_id: teamId }),
    });


    const result = await res.json();

    if (!res.ok) {
      // Dacă vrei alert:
      alert(result.error || 'Eroare necunoscută');
      return;
    }

    // Succes
    console.log('User creat:', result);
    setEmail('');
    setPassword('');
    setRole('');
    setTeamId('');

  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Adaugă Utilizator</h1>
      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 border mb-4"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Parolă"
        className="w-full p-2 border mb-4"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <select
        className="w-full p-2 border mb-4"
        value={role}
        onChange={e => setRole(e.target.value)}
      >
        <option value="">Selectează functia</option>
        <option value="admin">Admin</option>
        <option value="team_lead">Team Lead</option>
        <option value="transport_manager">Transport Manager</option>
        <option value="dispatcher">Dispatcher</option>
      </select>
      <select
        className="w-full p-2 border mb-4"
        value={teamId}
        onChange={e => setTeamId(e.target.value)}
      >
        <option value="">Selectează echipă</option>
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Creează cont
      </button>
    </div>
  );
}
