// src/pages/TeamList.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

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

        const { data: teams, errorTteams } = await supabase
            .from('teams')
            .select('id, name');

        if (errorTteams) {
            console.error('Error fetching teams:', errorTteams);
            return;
        }

        const grouped = {};
        for (const u of teamUsers) {
            if (!grouped[u.team_id]) grouped[u.team_id] = [];
            grouped[u.team_id].push(u);
        }

        //TODO: check No Team idk why it works
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

    // Delete
    const handleDelete = async (teamId) => {
        if (!window.confirm('Ești sigur că vrei să ștergi echipa? Această acțiune este ireversibilă.')) {
            return;
        }

        try {
            // Delete team functionality
            console.log('deleted team: ' + teamId);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const deleteTeam = await fetch(`/api/admin/teams/${teamId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            // Delete check + TODO: update users without a team to fallback team
            if (deleteTeam.ok) {
                console.log('deleteOk')
                const { error: updateError } = await supabase
                .from('users')
                .update({ team_id: 'cf70d8dc-5451-4979-a50d-c288365c77b4' })
                .eq('team_id', teamId);

            if (updateError) {
                console.log('reassign error')
                alert('Eroare la reasignarea utilizatorilor: ' + updateError.message);
                return;
            }
                await fetchTeamsAndUsers();
            } else {
                const err = await res.json();
                alert('Eroare la ștergere: ' + err.error);
            }
        } catch (err) {
            alert('A apărut o eroare: ' + err.message);
        }
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-red-600 via-white to-gray-400 relative">
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

                <div className="flex space-x-2">
                    <div className="flex space-x-2">
                        {user.role === 'admin' && (
                            <>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="bg-red-600 text-white px-3 py-1 rounded"
                                >
                                    Panou Admin
                                </button>
                                <button
                                    onClick={() => navigate('/admin/teams')}
                                    className="bg-red-600 text-white px-3 py-1 rounded"
                                >
                                    Vezi Echipe
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => navigate("/")}
                            className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 transition"
                        >
                            Main Page
                        </button>
                        <button
                            onClick={() => navigate("/history")}
                            className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700 transition"
                        >
                            History
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                        >
                            Log out
                        </button>
                    </div>
                    <div className="text-lg font-bold text-gray-800">
                        {user?.username ? formatName(user.username) : ""}
                    </div>
                </div>
            </header>

            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Echipe</h1>
                    <button 
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                        onClick={()=>navigate("/add")}
                    >
                        Add Team
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {teams.map((team, index) => (
                        <div key={index} className="border rounded p-4 shadow bg-white">
                            <h2 className="font-semibold mb-2">Echipa: {team.name}</h2>
                            <p className="mb-2 text-sm text-gray-500">
                                Team Lead: {
                                    team.members?.find(member => member.role === 'team_lead') 
                                    ? formatName(team.members.find(member => member.role === 'team_lead').username) 
                                    : 'Nespecificat'
                                }
                            </p>
                            <div className="mb-3">
                                <h3 className="text-sm font-semibold">Membri:</h3>
                                <ul className="text-sm">
                                    {team.members.map((member) => (
                                        <li key={member.id}>• {formatName(member.username)} ({member.role})</li>
                                    ))}
                                </ul>
                            </div>
                            <button
                                onClick={() => handleDelete(team.teamId)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded mr-2"
                            >
                                Șterge echipa
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
