// src/pages/TeamList.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header';

export default function TeamList({ user }) {
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();

  // fetch necesar pentru refresh
  const fetchTeamsAndUsers = async () => {
    try {
      const { data: teamUsers, error } = await supabase
        .from('users')
        .select('id, username, team_id, role')
        .order('team_id');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const { data: teamsData, error: errorTeams } = await supabase
        .from('teams')
        .select('id, name, url_key');

      if (errorTeams) {
        console.error('Error fetching teams:', errorTeams);
        return;
      }

      const FALLBACK_TEAM_ID = 'cf70d8dc-5451-4979-a50d-c288365c77b4';

      const grouped = {};
      for (const u of teamUsers) {
        const teamId = u.team_id || FALLBACK_TEAM_ID;
        if (!grouped[teamId]) grouped[teamId] = [];
        grouped[teamId].push(u);
      }

      const teamList = Object.entries(grouped).map(([teamId, members]) => {
        const teamData = teamsData.find(t => t.id === teamId);
        return {
          teamId,
          url_key: teamData?.url_key ?? null,
          name: teamData?.name || 'No Team',
          members,
        };
      });

      setTeams(teamList);
    } catch (err) {
      console.error('Error loading teams and users:', err);
    }
  };

  useEffect(() => {
    fetchTeamsAndUsers();
  }, []);

  const formatName = (username = '') => {
    if (!username || !username.includes('@')) return 'Fără Nume';
    const local = username.split('@')[0];
    const parts = local.split('.');
    return parts.map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ');
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi echipa? Această acțiune este ireversibilă.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('Nu ești autentificat');
        return;
      }

      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Eroare la ștergere: ' + (err.error || 'Unknown error'));
        return;
      }

      const result = await res.json();
      alert(result.message || 'Echipă ștearsă cu succes');
      await fetchTeamsAndUsers();
    } catch (error) {
      console.error('Eroare la ștergere echipă:', error);
      alert('Eroare la ștergere echipă');
    }
  };

  const visibleTeams =
    user.role === 'admin'
      ? teams
      : user.role === 'team_lead'
      ? teams.filter(t => t.teamId === user.team_id)
      : [];

  // helpers for listing members from each team
  const isLeadish = r => r === 'team_lead' || r === 'admin';
  const initials = (username='') => {
    const local = username.split('@')[0] || '';
    const [a='', b=''] = local.split('.');
    return `${a[0]||''}${b[0]||''}`.toUpperCase() || 'U';
  };
  const roleBadge = (role) =>
    role === 'admin'
      ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30'
      : role === 'team_lead'
      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
      : 'bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30';


  return (
    <div
      className="
        min-h-screen transition-colors
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800
        dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
      "
    >
      <Header user={user} />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Teams</h1>

          {user.role === 'admin' && (
            <button
              className="
                bg-gradient-to-r from-emerald-400 to-emerald-600
                hover:from-emerald-500 hover:to-emerald-700
                text-white px-4 py-2 rounded-full text-sm font-medium
                shadow-md hover:shadow-lg transition
                focus:outline-none focus:ring-2 focus:ring-emerald-400/60
              "
              onClick={() => navigate('/add')}
            >
              Add Team
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {visibleTeams.map((team) => (
            <div
              key={team.teamId}
              className="
                relative
                border border-gray-300 dark:border-white/10
                bg-white/80 dark:bg-gray-800/30
                backdrop-blur-md rounded-lg p-6 text-center
                shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:scale-[1.02]
              "
            >
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {team.name}
              </h2>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Team Lead:{' '}
                {team.members?.find(member => member.role === 'team_lead')
                  ? formatName(team.members.find(member => member.role === 'team_lead').username)
                  : 'Nespecificat'}
              </p>

              {/* <div className="text-left mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Members:</h3>
                <ul className="text-sm text-gray-800 dark:text-gray-800 list-disc list-inside space-y-1">
                  {[...team.members]
                    .sort((a, b) =>
                      a.role === 'team_lead' ? -1 : b.role === 'team_lead' ? 1 : 0
                    )
                    .map((member) => (
                      <li key={member.id}>
                        {formatName(member.username)} ({member.role})
                      </li>
                    ))
                  }
                </ul>
              </div> */}

              <div className="text-left mb-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Members
                </h3>

                <ul
                  className="
                    max-h-48 overflow-y-auto
                    rounded-lg p-2
                    bg-gray-50 dark:bg-gray-900/40
                    border border-gray-200 dark:border-gray-700
                    divide-y divide-gray-200 dark:divide-gray-700/70
                    list-none
                  "
                >
                  {[...team.members]
                    .sort((a, b) => {
                      // lead/admin first, then alpha
                      if (isLeadish(a.role) && !isLeadish(b.role)) return -1;
                      if (!isLeadish(a.role) && isLeadish(b.role)) return 1;
                      return formatName(a.username).localeCompare(formatName(b.username));
                    })
                    .map((m) => (
                      <li key={m.id} className="py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700
                                            flex items-center justify-center text-xs font-semibold
                                            text-gray-700 dark:text-gray-100">
                              {initials(m.username)}
                            </div>
                            <span className="truncate text-sm text-gray-900 dark:text-gray-100">
                              {formatName(m.username)}
                            </span>
                          </div>

                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md uppercase tracking-wide ${roleBadge(m.role)}`}>
                            {m.role.replace('_',' ')}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>


              <div className="flex justify-center space-x-2 mt-4">
                {user.role === 'admin' && (
                  <>
                    <button
                      onClick={() => handleDelete(team.teamId)}
                      className="
                        bg-gradient-to-r from-red-400 to-red-600
                        text-white px-4 py-2 rounded-full text-sm font-medium
                        shadow-md hover:shadow-lg transition
                        focus:outline-none focus:ring-2 focus:ring-red-400/60
                      "
                    >
                      Delete Team
                    </button>

                    <button
                      onClick={() => navigate(`/admin/teams/${team.url_key}`)}
                      className="
                        ml-2 bg-gradient-to-r from-blue-500 to-blue-700
                        text-white px-4 py-2 rounded-full text-sm font-medium
                        shadow-md hover:shadow-lg transition
                        focus:outline-none focus:ring-2 focus:ring-blue-400/60
                      "
                    >
                      View
                    </button>
                  </>
                )}

                {user.role === 'team_lead' && (
                  <button
                    onClick={() => navigate(`/admin/teams/${team.url_key}`)}
                    className="
                      ml-2 bg-gradient-to-r from-blue-500 to-blue-700
                      text-white px-4 py-2 rounded-full text-sm font-medium
                      shadow-md hover:shadow-lg transition
                      focus:outline-none focus:ring-2 focus:ring-blue-400/60
                    "
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Transporeon idea: - curse inregistrate sa apara direct pe spotgo
