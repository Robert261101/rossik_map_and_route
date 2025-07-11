import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AddTeam({ user }) {
  const [name, setName] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, team_id')
        .order('username');

      if (!error) setUsers(data);
      else console.error('Eroare la fetch users:', error);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Completează numele echipei');
    setLoading(true);

    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert([{ name, created_by: user.id}])
      .select()
      .single();

    if (teamError || !newTeam) {
      console.error('Eroare creare echipă:', teamError);
      alert('Eroare la creare echipă');
      setLoading(false);
      return;
    }

    const updates = [];

    if (teamLeadId) {
      updates.push(
        supabase
          .from('users')
          .update({ team_id: newTeam.id, role: 'team_lead' })
          .eq('id', teamLeadId)
      );
    }

    const membersToAdd = selectedUserIds.filter((uid) => uid !== teamLeadId);
    if (membersToAdd.length) {
      updates.push(
        supabase
          .from('users')
          .update({ team_id: newTeam.id })
          .in('id', membersToAdd)
      );
    }

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed) {
      console.error('Eroare la asignare membri:', failed.error);
      alert('Eroare la asignare membri');
    } else {
      navigate('/admin/teams');
    }
    setLoading(false);
  };

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

  return (
  <div className="min-h-screen bg-gradient-to-br from-red-600 via-white to-gray-400 relative">
    {/* SVG Pattern Background */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 640 640">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#E5E7EB" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    <div className="relative z-10 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl bg-white shadow-2xl rounded-3xl p-10 space-y-8 border border-gray-200">
        <h2 className="text-4xl font-bold text-gray-800 border-b pb-5 tracking-tight">Create New Team</h2>

        <form onSubmit={handleSubmit} className="space-y-6 text-lg">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Team Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Distribuție Nord"
              className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-red-600 focus:border-red-600 text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Team Lead (optional)</label>
            <select
              value={teamLeadId}
              onChange={(e) => setTeamLeadId(e.target.value)}
              className="w-full px-5 py-3 border border-gray-300 rounded-xl text-lg"
            >
              <option value="">-- Select --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatName(u.username)} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-3">
              Team Members (optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto border p-3 rounded-xl bg-gray-50">
              {users.map((u, idx) => {
                const colCount = 2; // trebuie să fie egal cu `sm:grid-cols-2`
                const row = Math.floor(idx / colCount);
                const col = idx % colCount;
                const isEven = (row + col) % 2 === 0;

                return (
                  <label
                    key={u.id}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                      isEven ? 'bg-gray-100 hover:bg-gray-300' : 'bg-gray-200 hover:bg-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={() => toggleUserSelection(u.id)}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="text-base text-gray-800 font-medium">
                      {formatName(u.username)} ({u.role})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/teams')}
              className="text-red-600 hover:underline text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl text-lg shadow-md"
            >
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);

}
