// src/pages/admin/ResetPassword.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

export default function ResetPassword({ user, handleLogout }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('users').select('id, username');
      if (error) console.error('Eroare la încărcarea utilizatorilor:', error);
      else setUsers(data);
    })();
  }, []);

  const handleReset = async () => {
    if (!selected || !newPassword) {
      alert('Selectează un utilizator și introdu o parolă nouă');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/admin/user/${selected}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
    });

    if (res.ok) {
      alert('Parola a fost resetată');
      navigate('/admin');
    } else {
      const err = await res.json();
      alert('Eroare la resetare: ' + err.error);
    }
  };

  const formatName = (email = '') => email?.split('@')[0] || 'Anonim';

  return (
    <div className={`min-h-screen top-0 z-50 transition-colors duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}>
      <header className="top-0 z-50 dark:text-white">
        <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center">
            <span className="font-bold text-2xl tracking-tight">
              Rossik Route Calculation
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {/* <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded hover:bg-white/40 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button> */}
            <button onClick={() => navigate('/admin')} className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow">Admin Panel</button>
            <button onClick={() => navigate('/admin/teams')} className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow">Teams</button>
            <button onClick={() => navigate('/')} className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow">Main Page</button>
            <button onClick={() => navigate('/history')} className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow">History</button>
            <button onClick={handleLogout} className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow">Logout</button>
            <div className="text-xl font-semibold ml-3">
              {formatName(user?.email)}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-xl mx-auto mt-10 bg-white/80 dark:bg-gray-800/30 backdrop-blur-md rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Resetează Parolă</h1>

        <select
          className="w-full p-3 mb-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">Selectează un utilizator</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>

        <input
          type="password"
          placeholder="Parola nouă"
          className="w-full p-3 mb-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />

        <button
          onClick={handleReset}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-700 hover:from-yellow-600 hover:to-yellow-800 text-white py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition"
        >
          Resetează
        </button>
      </div>
    </div>
  );
}
