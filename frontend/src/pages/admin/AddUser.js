import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

export default function AddUser({ user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('teams').select('id, name').order('name');
      if (error) console.error('Eroare la încărcarea echipelor:', error);
      else setTeams(data || []);
    })();
  }, []);

  const handleAdd = async () => {
    if (!email || !password || !role || !teamId) {
      alert('Completează toate câmpurile!');
      return;
    }

    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session?.access_token) {
      alert('You must be logged in to add a user');
      return;
    }
    const token = session.access_token;

    const res = await fetch('/api/admin/user/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password, role, team_id: teamId }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(result.error || 'Eroare necunoscută');
      return;
    }

    // optional: go back to teams/users after success
    setEmail('');
    setPassword('');
    setRole('');
    setTeamId('');
    alert('User created successfully');
    navigate('/admin');
  };

  return (
    <div
      className="
        min-h-screen transition-colors
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
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
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">Add User</h1>

        <input
          type="email"
          placeholder="Email"
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <select
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="team_lead">Team Lead</option>
          <option value="transport_manager">Transport Manager</option>
          <option value="dispatcher">Dispatcher</option>
        </select>

        <select
          className="
            w-full p-3 mb-6 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={teamId}
          onChange={e => setTeamId(e.target.value)}
        >
          <option value="">Select Team</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <button
          onClick={handleAdd}
          className="
            w-full py-3 rounded-full font-semibold shadow-md transition
            bg-gradient-to-r from-emerald-400 to-emerald-600
            hover:from-emerald-500 hover:to-emerald-700
            text-white
            focus:outline-none focus:ring-2 focus:ring-emerald-400/60
          "
        >
          Creează cont
        </button>
      </div>
    </div>
  );
}