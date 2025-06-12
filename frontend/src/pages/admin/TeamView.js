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
                .single()

            if(teamError) {
                console.error('Error fetching team: ', teamError);
                return;
            }

            setTeamName(teamData?.name);

            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, username, role')
                .eq('team_id', teamId);

            if(usersError) {
                console.error('Error fetching users:', usersError);
                return;
            }

            setUsers(usersData);
        };

        fetchTeamAndUsers();
    }, (teamId));
    
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
         <div className="p-6 max-w-xl mx-auto">
        <button 
            className="mb-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => navigate('/admin/teams')}
        >
            Back
        </button>
        <button 
            className=" bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700"
            onClick={() => navigate(`/admin/teams/${teamId}/add-members`)}

        >
            Add Member
        </button>
        <h1 className="text-2xl font-bold mb-4">Users in {teamName}</h1>
        {users.length === 0 ? (
            <p>No users found in this team.</p>
        ) : (
            <ul className="list-disc pl-5">
            {users.map(user => (
                <li key={user.id} className="mb-1 flex justify-between items-center">
                <span>{formatName(user.username)} ({user.role})</span>
                <button
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded ml-4"
                    onClick={() => handleRemoveMember(user.id)}
                >
                    Remove
                </button>
                </li>
            ))}
            </ul>
        )}
        </div>
    );
}