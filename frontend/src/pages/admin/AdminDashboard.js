// src/pages/AdminDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import User from 'lucide-react/dist/esm/icons/user';
import Truck from 'lucide-react/dist/esm/icons/truck';
import ViewAdminDashboardUsers from '../admin/ViewAdminDashboardUsers';
import ViewAdminDashboardTrucks from '../admin/ViewAdminDashboardTrucks';
import Header from '../../components/header';

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [showUsersModal, setShowUsersModal] = React.useState(false);
  const [showTrucksModal, setShowTrucksModal] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [trucks, setTrucks] = React.useState([]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, teams!users_team_id_fkey(name)')
      .order('role');

    if (error) {
      console.error('Fetch users error:', error);
      return;
    }

    const formatted = (data || []).map(user => ({
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
      .from("trucks")
      .select("id, plate, euro_per_km, price_per_day")
      .order("plate");

    if (error) {
      console.error("Fetch trucks error:", error);
      alert("Failed to load trucks: " + error.message);
      return;
    }

    const formatted = (data || []).map((truck) => ({
      id: truck.id,
      plate: truck.plate,
      euroPerKm: truck.euro_per_km,
      pricePerDay: truck.price_per_day,
    }));

    setTrucks(formatted);
    setShowTrucksModal(true);
  };

  // same layout, just dark-aware styles
  const Box = ({ label, type, Icon }) => {
    const handleView = () => {
      if (type === 'user') fetchUsers();
      if (type === 'truck') fetchTrucks();
    };

    return (
      <div
        onClick={handleView}
        className="
          relative cursor-pointer
          border border-gray-300 dark:border-white/10
          bg-white/90 dark:bg-gray-800/60
          backdrop-blur-md rounded-lg p-6 min-w-[280px] text-center
          shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:scale-[1.02] group
        "
      >
        <div className="absolute top-0 right-0 m-3 text-xs px-2 py-1 bg-emerald-500 text-white rounded-full shadow-sm">
          Active
        </div>
        <div className="flex justify-center mb-4">
          <Icon className="h-10 w-10 text-blue-600 group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300 transition duration-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{label}</h2>
        <div className="flex justify-center space-x-3">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/${type}/add`); }}
            className="
              bg-gradient-to-r from-emerald-400 to-emerald-600 text-white
              px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition
              focus:outline-none focus:ring-2 focus:ring-emerald-400/60
            "
          >
            Add
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/${type}/delete`); }}
            className="
              bg-gradient-to-r from-red-400 to-red-600 text-white
              px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition
              focus:outline-none focus:ring-2 focus:ring-red-400/60
            "
          >
            Delete
          </button>
          {type === 'user' && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/admin/${type}/reset`); }}
              className="
                bg-gradient-to-r from-amber-400 to-amber-600 text-white
                px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition
                focus:outline-none focus:ring-2 focus:ring-amber-400/60
              "
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
      className="
        min-h-screen transition-colors
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
        dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
      "
    >
      <Header user={user} />

      <main className="py-12 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-10 text-center text-gray-900 dark:text-white">
          Administrative Dashboard
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-10">
          <Box label="User Accounts" type="user" Icon={User} />
          <Box label="Trucks" type="truck" Icon={Truck} />
        </div>
      </main>

      {/* Background Particle Layer (light + dark) */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="
            w-full h-full
            bg-[radial-gradient(#00000014_1px,transparent_1px)]
            dark:bg-[radial-gradient(#ffffff22_1px,transparent_1px)]
            bg-[length:20px_20px]
          "
          style={{ opacity: 0.22 }}
        />
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
          onRefresh={fetchTrucks}
        />
      )}
    </div>
  );
}

// TODO: dont forget about promptmodal in /src/components
