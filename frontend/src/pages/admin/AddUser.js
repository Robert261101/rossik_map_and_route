// src/pages/admin/AddUser.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import RossikLogo from '../../VektorLogo_Rossik_rot.gif';
import { Link } from 'react-router-dom';
import Header from '../../components/header';



export default function AddUser({user, handleLogout}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = React.useState(false);
  

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

    const {
      data: { session },
      error: sessionErr
    } = await supabase.auth.getSession();
    if (sessionErr || !session?.access_token) {
      alert('You must be logged in to delete a route');
      return;
    }
    const token = session?.access_token;

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
      alert(result.error || 'Eroare necunoscută');
      return;
    }

    setEmail('');
    setPassword('');
    setRole('');
    setTeamId('');
  };

  const formatName = (email = "") => {
    if (!email || !email.includes('@')) return 'Fără Nume';
    const local = email.split("@")[0];
    const parts = local.split(".");
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  };

  return (
    <div className={`min-h-screen top-0 z-50 transition-colors duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}>
      <Header user = {user} />
      
      <div className="p-6 max-w-xl mx-auto mt-10 bg-white/80 dark:bg-gray-800/30 backdrop-blur-md rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Adaugă Utilizator</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 "
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Parolă"
          className="w-full p-3 mb-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <select
          className="w-full p-3 mb-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 "
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="">Selectează funcția</option>
          <option value="admin">Admin</option>
          <option value="team_lead">Team Lead</option>
          <option value="transport_manager">Transport Manager</option>
          <option value="dispatcher">Dispatcher</option>
        </select>
        <select
          className="w-full p-3 mb-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
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
          className="w-full bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition"
        >
          Creează cont
        </button>
      </div>
    </div>
  );
}
