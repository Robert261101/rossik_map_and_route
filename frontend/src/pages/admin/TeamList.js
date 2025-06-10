// src/pages/TeamList.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function TeamList({ user }) {
    const [teams, setTeams] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            const { data: teamUsers, error } = await supabase
                .from('users')
                .select('id, username, team_id, role')
                .order('team_id');

            console.log('Loaded users:', teamUsers);
            if (error) {
                console.error('Error fetching users:', error);
                return;
            }



            const { data: teams, errorTteams } = await supabase
                .from('teams')
                .select('id, name');

            console.log('Loaded teams:', teams);
            if (errorTteams) {
                console.error('Error fetching teams:', errorTteams);
                return;
            }


            
            const grouped = {};
            for (const u of teamUsers) {
                if (!grouped[u.team_id]) grouped[u.team_id] = [];
                grouped[u.team_id].push(u);
            }

            
            const teamList = Object.entries(grouped).map(([teamId, members]) => ({
                teamId,
                members,
                
            }));



            console.log('Teams:', teams);
            setTeams(teamList);
        })();
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

    return (
        <div className="App flex flex-col h-screen">
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
                <h1 className="text-2xl font-bold mb-4">Echipe</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {teams.map((team, index) => (
                        <div key={index} className="border rounded p-4 shadow bg-white">
                            <h2 className="font-semibold mb-2">Echipa #{team.teamId}</h2>
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
                                onClick={() => navigate(`/admin/teams/${team.teamId}`)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                            >
                                Vezi echipa
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
