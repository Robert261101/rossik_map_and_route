// src/pages/admin/ResetPassword.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

export default function ResetPassword({ user }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

      if (error) console.error('Eroare la încărcarea utilizatorilor:', error);
      else setUsers(data || []);
    })();
  }, []);

  const handleReset = async () => {
    if (!selected || !newPassword) {
      alert('Selectează un utilizator și introdu o parolă nouă');
      return;
    }

    const { data: { session } = {} } = await supabase.auth.getSession();
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
      const err = await res.json().catch(() => ({}));
      alert('Eroare la resetare: ' + (err.error || 'Unknown error'));
    }
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
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Reset Password
        </h1>

        <select
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">Select a user</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>

        <input
          type="password"
          placeholder="Parola nouă"
          className="
            w-full p-3 mb-6 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />

        <button
          onClick={handleReset}
          disabled={!selected || !newPassword}
          className="
            w-full py-3 rounded-full font-semibold shadow-md transition
            bg-gradient-to-r from-yellow-500 to-yellow-700 text-white
            hover:from-yellow-600 hover:to-yellow-800
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-yellow-400/60
          "
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}
