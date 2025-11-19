// src/pages/AddTeamMembers.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { roleForTeam } from '../../lib/roles';

export default function AddTeamMembers() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, team_id')
        .not('team_id', 'eq', teamId)
        .order('username');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      setUsers(data || []);
    };
    fetchUsers();
  }, [teamId]);

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const formatName = (username) => {
    if (!username?.includes('@')) return 'Fără Nume';
    return username
      .split('@')[0]
      .split('.')
      .map((p) => p[0]?.toUpperCase() + p.slice(1))
      .join(' ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      alert('Selectează cel puțin un membru pentru a adăuga.');
      return;
    }
    setLoading(true);

    const { error } = await supabase
      .from('users')
      .update({ team_id: teamId, role: roleForTeam(teamId) })
      .in('id', selectedUserIds);

    if (error) {
      console.error('Error adding members:', error);
      alert('Eroare la adăugarea membrilor.');
      setLoading(false);
      return;
    }
    navigate(`/admin/teams/${teamId}`);
  };

  return (
    <div
      className="
        min-h-screen flex flex-col items-center
        bg-gradient-to-br from-red-600 via-white to-gray-400
        dark:from-gray-800 dark:via-gray-900 dark:to-black
        text-gray-800 dark:text-gray-100
        p-6
      "
    >
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Add Team Members
      </h1>

      <form
        onSubmit={handleSubmit}
        className="
          w-full max-w-lg
          bg-white dark:bg-gray-800/90
          border border-gray-200 dark:border-gray-700
          p-6 rounded-xl shadow-lg
        "
      >
        {/* Members picker — pretty, dark-mode aware list */}
        <div
          className="
            max-h-72 overflow-y-auto mb-6
            border border-gray-200 dark:border-gray-700
            rounded-lg p-2
            bg-white dark:bg-gray-900/40
          "
        >
          {users.length === 0 ? (
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              All users are already in a team or no other users available.
            </p>
          ) : (
            users.map((user) => (
              <label
                key={user.id}
                className="
                  flex items-center justify-between gap-3
                  px-3 py-2 rounded-md cursor-pointer
                  odd:bg-gray-100 even:bg-white
                  dark:odd:bg-gray-800 dark:even:bg-gray-900
                  hover:bg-gray-200 dark:hover:bg-gray-600
                  text-gray-900 dark:text-gray-100
                  transition
                "
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-base font-medium">
                    {formatName(user.username)}{" "}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({user.role})
                    </span>
                  </span>
                </div>

                {/* Optional: small pill showing current team or 'No team' */}
                {user.team_id ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    In another team
                  </span>
                ) : null}
              </label>
            ))
          )}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              px-4 py-2 rounded
              bg-gray-300 hover:bg-gray-400
              text-gray-800
              dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-gray-400
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || users.length === 0}
            className="
              px-6 py-2 rounded
              bg-red-600 hover:bg-red-700 text-white font-semibold
              disabled:opacity-50
              focus:outline-none focus:ring-2 focus:ring-red-400/60
            "
          >
            {loading ? 'Adding...' : 'Add Members'}
          </button>
        </div>
      </form>
    </div>
  );
}
