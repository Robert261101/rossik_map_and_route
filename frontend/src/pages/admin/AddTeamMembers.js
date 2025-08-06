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

      setUsers(data);
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
    <div className="min-h-screen bg-white p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">Adaugă Membri în Echipa</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white p-6 rounded-xl shadow-lg">
        <div className="max-h-72 overflow-y-auto mb-6 border rounded p-3 bg-gray-50">
          {users.length === 0 ? (
            <p className="text-gray-600">Toți utilizatorii sunt deja în această echipă sau nu există alți utilizatori disponibili.</p>
          ) : (
            users.map((user) => (
              <label
                key={user.id}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => toggleUserSelection(user.id)}
                  className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="text-base font-medium text-gray-800">
                  {formatName(user.username)} ({user.role})
                </span>
              </label>
            ))
          )}
        </div>
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={loading || users.length === 0}
            className="px-6 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Adăugare...' : 'Adaugă Membri'}
          </button>
        </div>
      </form>
    </div>
  );
}
