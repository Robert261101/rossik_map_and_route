import { React, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AddTeam({ user }) {
  const [name, setName] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error('Eroare users:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/admin/teams/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, team_lead_user_id: teamLeadId }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      navigate('/admin/teams');
    } else {
      alert(data.error || 'Eroare la creare echipă');
    }
  };

  return (
    <div>
      <h2>Creare Echipa</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nume echipă"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <select value={teamLeadId} onChange={(e) => setTeamLeadId(e.target.value)} required>
          <option value="">Selectează Team Lead</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email} ({u.role})
            </option>
          ))}
        </select>

        <button type="submit" disabled={loading}>
          {loading ? 'Se salvează...' : 'Salvează'}
        </button>
      </form>
    </div>
  );
}
