// src/pages/TeamList.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import RossikLogo from '../../VektorLogo_Rossik_rot.gif'
import { Link } from 'react-router-dom';

export default  function TeamList({ user }) {
    const [teams, setTeams] = useState([]);
    const [viewedTeamId, setViewedTeamId] = useState(null);
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = React.useState(false);

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

        const { data: teams, errorTteams } = await supabase
            .from('teams')
            .select('id, name');

        if (errorTteams) {
            console.error('Error fetching teams:', errorTteams);
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
            const teamData = teams.find(t => t.id === teamId);
            return {
                teamId,
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleDelete = async (teamId) => {
        if (!window.confirm('Ești sigur că vrei să ștergi echipa? Această acțiune este ireversibilă.')) {
            return;
        }

        try {
            // Get the current session to extract the token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
            alert('Nu ești autentificat');
            return;
            }

            // Call your server API to delete the team
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

            // Refresh the teams list after deletion
            await fetchTeamsAndUsers();

        } catch (error) {
            console.error('Eroare la ștergere echipă:', error);
            alert('Eroare la ștergere echipă');
        }
    };

    const toggleView = (teamId) => {
        if (viewedTeamId === teamId) {
        setViewedTeamId(null); // close if same team clicked again
        } else {
        setViewedTeamId(teamId);
        }
    };

    const visibleTeams =
        user.role === 'admin'
            ? teams
            : user.role === 'team_lead'
            ? teams.filter(t => t.teamId === user.team_id)
            : [];

    return (
        <div className={`min-h-screen top-0 z-50 transition-colors duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-800'}`}>
        <header className="top-0 z-50">
            <div className="max-w-100xl mx-auto px-6 py-5 flex justify-between items-center">
            {/* LEFT: Logo / Title */}
            <div className="flex items-center">
                <Link to="/">
                    <img
                    src={RossikLogo}
                    alt="Rossik Logo"
                    className="h-12 object-contain cursor-pointer"
                    />
                </Link>
            </div>

            {/* RIGHT: Buttons */}
            <div className="flex items-center space-x-3">
                {/* <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 rounded hover:bg-white/40 dark:hover:bg-gray-700"
                aria-label="Toggle Dark Mode"
                >
                {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                </button> */}

                {/* Show admin buttons only for admin */}
                <button
                    onClick={() => navigate('/spotgo')}
                    className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow">
                    SpotGo
                </button>
                {user.role === 'admin' && (
                    <button
                    onClick={() => navigate('/admin')}
                    className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                    >
                    Admin Panel
                    </button>
                )}
                {(user.role === 'admin' || user.role === 'team_lead') && (
                    <button
                        onClick={() => navigate('/admin/teams')}
                        className="text-base px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow"
                    >
                        Teams
                    </button>
                )}
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

                {/* Username formatted */}
                <div className="text-xl font-semibold ml-3">
                {formatName(user?.email)}
                </div>
            </div>
            </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl font-extrabold">Teams</h1>
            {user.role === 'admin' && (
                <button
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
                    onClick={() => navigate('/add')}
                >
                    Add Team
                </button>
            )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {visibleTeams.map((team, index) => (
                <div
                key={index}
                className="relative border border-white/30 bg-white/80 dark:bg-gray-800/30 backdrop-blur-md rounded-lg p-6 text-center shadow-xl hover:shadow-2xl transition-transform duration-300 transform hover:scale-[1.02]"
                >
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{team.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Team Lead:{' '}
                    {team.members?.find(member => member.role === 'team_lead')
                    ? formatName(team.members.find(member => member.role === 'team_lead').username)
                    : 'Nespecificat'}
                </p>
                <div className="text-left mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Members:</h3>
                    <ul className="text-sm text-gray-800 dark:text-gray-100 list-disc list-inside space-y-1">
                    {team.members.map((member) => (
                        <li key={member.id}>
                        {formatName(member.username)} ({member.role})
                        </li>
                    ))}
                    </ul>
                </div>
                {/* <button
                    onClick={() => handleDelete(team.teamId)}
                    className="bg-gradient-to-r from-red-400 to-red-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
                >
                    Delete Team
                </button>
                <button
                    onClick={() => navigate(`/admin/teams/${team.teamId}`)}
                    className="ml-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
                >
                    View
                </button> */}
                <div className="flex justify-center space-x-2 mt-4">
                {user.role === 'admin' && (
                    <>
                    <button
                        onClick={() => handleDelete(team.teamId)}
                        className="bg-gradient-to-r from-red-400 to-red-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
                    >
                        Delete Team
                    </button>
                    <button 
                        onClick={() => navigate(`/admin/teams/${team.teamId}`)}
                        className="ml-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
                    >
                        View
                    </button>
                    </>
                )}
                {user.role === 'team_lead' && (
                    <button 
                        onClick={() => navigate(`/admin/teams/${team.teamId}`)}
                        className="ml-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
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
