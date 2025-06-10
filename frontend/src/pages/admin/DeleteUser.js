// src/pages/admin/DeleteUser.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function DeleteUser({ user }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const navigate = useNavigate();
  const formatName = (email = "") => {
    if (!email || !email.includes('@')) return 'Fără Nume';
    const local = email.split("@")[0];
    const parts = local.split(".");
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  };

console.log(user)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('users').select('id, username, role');
      if (error) console.error('Eroare la încărcarea utilizatorilor:', error);
      else setUsers(data);
    })();
  }, []);

  const handleDelete = async (userId) => {
    if (!userId) return alert('Selectează un utilizator');

    const confirmDelete = window.confirm('Sigur vrei să ștergi userul?');
    if (!confirmDelete) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/admin/user/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (res.ok) {
      // Reîncarcă lista sau scoate userul local
    } else {
      const err = await res.json();
      alert('Eroare la ștergere: ' + err.error);
    }
  };



  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Șterge Utilizator</h1>
      <select
        className="w-full p-2 border mb-4"
        value={selected}
        onChange={e => setSelected(e.target.value)}
      >
        <option value="">Selectează un utilizator</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {formatName(u.username)} ({u.role})
          </option>
        ))}

      </select>
      <button
         onClick={() => handleDelete(selected)}
        className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
      >
        Șterge contul
      </button>
    </div>
  );
}
