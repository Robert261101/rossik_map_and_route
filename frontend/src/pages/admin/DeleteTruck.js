// src/pages/admin/DeleteTruck.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import RossikLogo from '../../VektorLogo_Rossik_rot.gif';

export default function DeleteTruck({ user, handleLogout }) {
  const [trucks, setTrucks] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/trucks', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const trucks = await res.json();
        setTrucks(trucks);
      } else {
        console.error('Trucks loading error');
      }
    })();
  }, []);

  const handleDelete = async () => {
    if (!selectedTruckId) {
      alert('Select a truck');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this truck?');
    if (!confirmDelete) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`/api/admin/trucks/${selectedTruckId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (res.ok) {
      alert('Truck deleted succesfully');
      setTrucks(prev => prev.filter(t => t.id !== selectedTruckId));
      setSelectedTruckId('');
    } else {
      const err = await res.json();
      alert('Delete Error: ' + err.error);
      console.error('Backend error:', err);
    }
  };

  const formatName = (email = "") => {
    if (!email || !email.includes('@')) return 'No name';
    const local = email.split("@")[0];
    const parts = local.split(".");
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-900'}`}>
      <header className="top-0 z-50 dark:text-white">
        <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center bg-gradient-to-r from-white/70 via-white to-white/70 p-2 rounded">
            <img
              src={RossikLogo}
              alt="Rossik Logo"
              className="h-12 object-contain"
            />
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
        <h1 className="text-3xl font-bold mb-6 text-center">Delete Truck</h1>

        <select
          className="w-full p-3 mb-6 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          value={selectedTruckId}
          onChange={e => setSelectedTruckId(e.target.value)}
        >
          <option value="">Selectează un camion</option>
          {trucks.map(t => (
            <option key={t.id} value={t.id}>{t.plate}</option>
          ))}
        </select>

        <button
          onClick={handleDelete}
          className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white py-3 rounded-full font-semibold shadow-md hover:shadow-lg transition"
        >
          Delete Truck
        </button>
      </div>
    </div>
  );
}
