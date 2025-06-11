// src/pages/AdminDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatName = (email = '') => {
    if (!email || !email.includes('@')) return 'Fără Nume';
    const local = email.split('@')[0];
    const parts = local.split('.');
    return parts.map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ');
  };

  const Box = ({ label, type }) => (
    <div className="border rounded-lg p-6 w-96 text-center shadow-lg bg-white hover:shadow-xl transition duration-300">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{label}</h2>
      <div className="flex justify-center space-x-3">
        <button
          onClick={() => navigate(`/admin/${type}/add`)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
        >
          Adaugă
        </button>
        <button
          onClick={() => navigate(`/admin/${type}/delete`)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        >
          Șterge
        </button>
        {type === 'user' && (
          <button
            onClick={() => navigate(`/admin/${type}/reset`)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md"
          >
            Resetează Parola
          </button>
        )}
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-white to-gray-400 relative">
      {/* HEADER */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 2l.01 6L7 8c0 1.333 4 2 4 2s4-.667 4-2l-2-.01V2H9zM3 13h7v7H5.5a2.5 2.5 0 01-2.5-2.5V13zM21 13h-7v7h4.5a2.5 2.5 0 002.5-2.5V13z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-800">Rossik Route Calculation</h1>
        </div>

        <div className="flex space-x-2 items-center">
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => navigate('/admin')}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Panou Admin
              </button>
              <button
                onClick={() => navigate('/admin/teams')}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Vezi Echipe
              </button>
            </>
          )}
          <button
            onClick={() => navigate("/")}
            className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
          >
            Main Page
          </button>
          <button
            onClick={() => navigate("/history")}
            className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
          >
            History
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
          >
            Log out
          </button>
          <div className="text-lg font-bold text-gray-800">
            {user?.email ? formatName(user.email) : ""}
          </div>
        </div>
      </header>

      {/* CONTINUT */}
      <main className="flex-1 flex flex-col items-center justify-start p-10">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
            Panou Administrativ
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
            <Box label="Cont" type="user" />
            <Box label="Camion" type="truck" />
        </div>
        </main>

    </div>
  );
}
