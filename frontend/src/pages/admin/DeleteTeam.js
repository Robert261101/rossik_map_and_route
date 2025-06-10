import { React, useState, useEffect } from 'react';

export default function DeleteTeam({ user }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTeams = () => {
    fetch('/api/admin/teams')
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(err => console.error('Eroare teams:', err));
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleDelete = async (teamId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi echipa?')) return;

    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchTeams();
    } else {
      alert('Eroare la ștergere');
    }
  };


  return (
    <div>
      <h2>Lista echipelor</h2>
      {teams.length === 0 ? <p>Nu există echipe.</p> : (
        <ul>
          {teams.map((team) => (
            <li key={team.id}>
              <strong>{team.name}</strong> — Lead: {team.team_lead_id}
              <button onClick={() => handleDelete(team.id)}>Șterge</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
