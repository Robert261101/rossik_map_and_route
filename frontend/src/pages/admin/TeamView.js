import { supabase } from "../../lib/supabase";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function TeamView() {
  const { key } = useParams();                 // public url_key
  const [team, setTeam] = useState(null);      // { id, name, url_key }
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const navigate = useNavigate();
  const FALLBACK_TEAM_ID = 'cf70d8dc-5451-4979-a50d-c288365c77b4';

  useEffect(() => {
    const fetchTeamAndUsers = async () => {
      setLoading(true);
      setErr('');
      try {
        // 1) Resolve url_key -> team row (id, name)
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, url_key')
          .eq('url_key', key)
          .single();

        if (teamError || !teamData) {
          setErr('Team not found');
          setTeam(null);
          setUsers([]);
          return;
        }
        setTeam(teamData);

        // 2) Fetch users by real team id
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, role')
          .eq('team_id', teamData.id);

        if (usersError) {
          setErr('Failed to load users');
          setUsers([]);
          return;
        }

        setUsers(usersData ?? []);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAndUsers();
  }, [key]);

  const formatName = (username = '') => {
    const local = username.split('@')[0] || '';
    return local
      .split('.')
      .map(p => p[0]?.toUpperCase() + p.slice(1))
      .join(' ') || 'Fără Nume';
  };

  const handleRemoveMember = async (userId) => {
    if (!team) return;
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ team_id: FALLBACK_TEAM_ID })  // keep your current behavior
        .eq('id', userId);

      if (error) return alert('Error removing member: ' + error.message);

      // refresh users
      const { data: updated, error: refetchErr } = await supabase
        .from('users')
        .select('id, username, role')
        .eq('team_id', team.id);

      if (!refetchErr) setUsers(updated ?? []);
    } catch (e) {
      console.error('Error removing member:', e);
      alert('Error removing member');
    }
  };

  const handleChangeName = async () => {
    if (!team) return;
    const newName = window.prompt('Enter the new team name:', team.name);
    if (!newName || newName === team.name) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: newName })
        .eq('id', team.id);

      if (error) throw error;
      setTeam(t => ({ ...t, name: newName }));
      alert(`Team renamed to “${newName}” 🎉`);
    } catch (err) {
      console.error('Error updating team name:', err);
      alert('❌ Failed to update team name: ' + err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }
  if (err || !team) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <p className="mb-4">{err || 'Team not found'}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
            onClick={() => navigate('/admin/teams')}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-white to-gray-400 relative">
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
          <div className="flex justify-between items-center">
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
              onClick={() => navigate('/admin/teams')}
            >
              Back
            </button>
            <div className="flex space-x-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                onClick={() => navigate(`/admin/teams/${team.url_key}/add-members`)}
              >
                Add Member
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                onClick={handleChangeName}
              >
                Edit Team Name
              </button>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-800 border-b pb-5 tracking-tight">
            Users in {team.name}
          </h1>

          {users.length === 0 ? (
            <p className="text-gray-600 text-lg">No users found in this team.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-3 max-h-96 overflow-y-auto">
              {users.map(u => (
                <li key={u.id} className="flex justify-between items-center">
                  <span className="text-lg text-gray-800 font-medium">
                    {formatName(u.username)} ({u.role})
                  </span>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-xl"
                    onClick={() => handleRemoveMember(u.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
