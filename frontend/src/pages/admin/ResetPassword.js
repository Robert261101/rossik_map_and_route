// src/pages/admin/ResetPassword.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [newPassword, setNewPassword] = useState('');
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

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Resetează Parolă</h1>
      <select
        className="w-full p-2 border mb-4"
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
        className="w-full p-2 border mb-4"
        value={newPassword}
        onChange={e => setNewPassword(e.target.value)}
      />
      <button
        onClick={handleReset}
        className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700"
      >
        Resetează
      </button>
    </div>
  );
}
