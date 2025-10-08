// src/pages/admin/DeleteUser.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

export default function DeleteUser({ user }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role')
        .order('username');

      if (error) {
        console.error('Eroare la încărcarea utilizatorilor:', error);
      } else {
        setUsers(data || []);
      }
    })();
  }, []);

  const handleDelete = async (userId) => {
    if (!userId) return alert('Selectează un utilizator');
    if (!window.confirm('Sigur vrei să ștergi userul?')) return;

    const { data: { session } = {} } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/admin/user/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelected('');
      alert('User deleted successfully ✅');
      navigate('/admin');

    } else {
      const err = await res.json().catch(() => ({}));
      alert('Eroare la ștergere: ' + (err.error || 'Unknown error'));
    }
  };

  const formatName = (email = '') => {
    if (!email || !email.includes('@')) return 'Fără Nume';
    const local = email.split('@')[0];
    return local
      .split('.')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
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
          Delete User
        </h1>

        <select
          className="
            w-full p-3 mb-6 rounded
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
              {formatName(u.username)} ({u.role})
            </option>
          ))}
        </select>

        <button
          onClick={() => handleDelete(selected)}
          disabled={!selected}
          className="
            w-full py-3 rounded-full font-semibold shadow-md transition
            bg-gradient-to-r from-red-500 to-red-700 text-white
            hover:from-red-600 hover:to-red-800
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-red-400/60
          "
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
