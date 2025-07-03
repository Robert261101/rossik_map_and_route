// src/pages/admin/DeleteUser.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import RossikLogo from '../../VektorLogo_Rossik_rot.gif';
import { Link } from 'react-router-dom';

export default function DeleteUser({ user, handleLogout }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('users').select('id, username, role');
      if (error) console.error('Eroare la încărcarea utilizatorilor:', error);
      else setUsers(data);
    })();
  }, []);

  const handleDelete = async (userId) => {
    if (!userId) return alert('Selectează un utilizator');
    if (!window.confirm('Sigur vrei să ștergi userul?')) return;

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
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSelected('');
    } else {
      const err = await res.json();
      alert('Eroare la ștergere: ' + err.error);
    }
  };

  const formatName = (email = "") => {
    if (!email || !email.includes('@')) return 'Fără Nume';
    const local = email.split("@")[0];
    const parts = local.split(".");
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  };

  return (
    <div className={`min-h-screen top-0 z-50 transition-colors duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}>
      <header className="top-0 z-50 dark:text-white">
        <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
          <Link to="/admin">
            <img src={RossikLogo} alt="Rossik Logo" className="h-12 object-contain cursor-pointer" />
          </Link>
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
        <h1 className="text-3xl font-bold mb-6 text-center">Șterge Utilizator</h1>
        <select
          className="w-full p-3 mb-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
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
          className="w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition"
        >
          Șterge contul
        </button>
      </div>
    </div>
  );
}
