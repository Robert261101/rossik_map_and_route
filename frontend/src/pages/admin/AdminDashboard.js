// src/pages/AdminDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import User from 'lucide-react/dist/esm/icons/user';
import Truck from 'lucide-react/dist/esm/icons/truck';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import * as LucideIcons from 'lucide-react';
import RossikLogo from '../../VektorLogo_Rossik_rot.gif';
import ViewAdminDashboardUsers from '../admin/ViewAdminDashboardUsers';
import ViewAdminDashboardTrucks from '../admin/ViewAdminDashboardTrucks';
import { Link } from 'react-router-dom';


export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = React.useState(false);
  const [showUsersModal, setShowUsersModal] = React.useState(false);
  const [showTrucksModal, setShowTrucksModal] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [trucks, setTrucks] = React.useState([]);

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

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, teams!users_team_id_fkey(name)')
      .order('role');


    if (error) {
      console.error('Fetch users error:', error);
      return;
    }

    const formatted = data.map(user => ({
      id: user.id,
      email: user.username,
      role: user.role,
      team_name: user.teams?.name || '—',
    }));

    setUsers(formatted);
    setShowUsersModal(true);
  };


  const fetchTrucks = async () => {
    const { data, error } = await supabase
      .from('trucks')
      .select('id, plate, teams(name), "Euro/km"')
      .order('plate');
    if (!error) {
      const formatted = data.map(truck => ({
        id: truck.id,
        plate: truck.plate,
        team_name: truck.teams?.name || null,
        euroPerKm: truck["Euro/km"],
      }));
      setTrucks(formatted);
      setShowTrucksModal(true);
    }
  };


  const Box = ({ label, type, Icon }) => {
    const handleView = () => {
      if (type === 'user') fetchUsers();
      if (type === 'truck') fetchTrucks();
    };

    return (
      <div
        onClick={handleView}
        className="relative cursor-pointer border border-white/30 bg-white/80 dark:bg-gray-800/30 backdrop-blur-md rounded-lg p-6 min-w-[280px] text-center shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:scale-[1.02] group"
      >
        <div className="absolute top-0 right-0 m-3 text-xs px-2 py-1 bg-emerald-500 text-white rounded-full shadow-sm">
          Active
        </div>
        <div className="flex justify-center mb-4">
          <Icon className="h-10 w-10 text-blue-500 group-hover:text-blue-600 transition duration-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{label}</h2>
        <div className="flex justify-center space-x-3">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/${type}/add`); }}
            className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
          >
            Add
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/${type}/delete`); }}
            className="bg-gradient-to-r from-red-400 to-red-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
          >
            Delete
          </button>
          {type === 'user' && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/admin/${type}/reset`); }}
              className="bg-gradient-to-r from-amber-400 to-amber-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    );
  };


  return (
    <div
       className={`min-h-screen top-0 z-50 transition-colors duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}
    >
      <header className="top-0 z-50">
        <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
          {/* LEFT: Logo / Titlu */}
            <div className="flex items-center">
              <Link to="/">
                <img
                  src={RossikLogo}
                  alt="Rossik Logo"
                  className="h-12 object-contain cursor-pointer"
                />
              </Link>
            </div>

          {/* RIGHT: Butoane */}
          <div className="flex items-center space-x-3">
            {/* <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded hover:bg-white/40 dark:hover:bg-gray-700"
            >
              {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button> */}

            <button
              onClick={() => navigate('/admin')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Admin Panel
            </button>
            <button
              onClick={() => navigate('/admin/teams')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Teams
            </button>
            <button
              onClick={() => navigate('/')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Main Page
            </button>
            <button
              onClick={() => navigate('/history')}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              History
            </button>
            
            <button
              onClick={handleLogout}
              className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
            >
              Logout
            </button>

            {/* Numele user-ului */}
            <div className="text-xl font-semibold ml-3">
              {formatName(user?.email)}
            </div>
          </div>
        </div>
      </header>


      <main className="py-12 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-10 text-center">Administrative Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-10">
          <Box label="User Accounts" type="user" Icon={User} />
          <Box label="Trucks" type="truck" Icon={Truck} />
        </div>
      </main>

      {/* Background Particle Layer */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
       <div className="w-full h-full bg-[radial-gradient(#ffffff33_1px,transparent_1px)] bg-[length:20px_20px] opacity-20"></div>
      </div>
      {showUsersModal && (
        <ViewAdminDashboardUsers
          users={users}
          onClose={() => setShowUsersModal(false)}
        />
      )}
      {showTrucksModal && (
        <ViewAdminDashboardTrucks
          trucks={trucks}
          onClose={() => setShowTrucksModal(false)}
        />
      )}
    </div>
  );
}

//TODO: add tarif/km for trucks