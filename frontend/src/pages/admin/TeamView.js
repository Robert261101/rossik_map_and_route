import { supabase } from "../../lib/supabase";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function TeamView({}) {
  const { teamId } = useParams();
  const [teamName, setTeamName] = useState('');
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const FALLBACK_TEAM_ID = 'cf70d8dc-5451-4979-a50d-c288365c77b4';

  useEffect(() => {
    const fetchTeamAndUsers = async () => {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      if (teamError) {
        console.error('Error fetching team: ', teamError);
        return;
      }

      setTeamName(teamData?.name);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, role')
        .eq('team_id', teamId);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }

      setUsers(usersData);
    };

    fetchTeamAndUsers();
  }, [teamId]);

  const formatName = (username = '') => {
    const local = username.split('@')[0];
    const parts = local.split('.');
    return parts.map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ');
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ team_id: FALLBACK_TEAM_ID })
        .eq('id', userId);

      if (error) {
        alert('Error removing member: ' + error.message);
        return;
      }

      // Refresh user list after update
      const { data: updatedUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, username, role')
        .eq('team_id', teamId);

      if (fetchError) {
        console.error('Error fetching updated users:', fetchError);
        return;
      }

      setUsers(updatedUsers);
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Error removing member');
    }
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
          {/* Header and Buttons */}
          <div className="flex justify-between items-center">
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
              onClick={() => navigate('/admin/teams')}
            >
              Back
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
              onClick={() => navigate(`/admin/teams/${teamId}/add-members`)}
            >
              Add Member
            </button>
          </div>

          <h1 className="text-4xl font-bold text-gray-800 border-b pb-5 tracking-tight">
            Users in {teamName}
          </h1>

          {/* User List */}
          {users.length === 0 ? (
            <p className="text-gray-600 text-lg">No users found in this team.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-3 max-h-96 overflow-y-auto">
              {users.map(user => (
                <li key={user.id} className="flex justify-between items-center">
                  <span className="text-lg text-gray-800 font-medium">
                    {formatName(user.username)} ({user.role})
                  </span>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-xl"
                    onClick={() => handleRemoveMember(user.id)}
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
