import React, { useState } from 'react';
import { useMainTracker } from 'entities/tracker/lib/useMainTracker';
import { YandexUserSelectConnected } from 'entities/track/yandex/ui/YandexUserSelectConnected/YandexUserSelectConnected';



export const TeamPage: React.FC = () => {
  const ldapPattern = /^60\d+$/;
  const [team, setTeam] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!ldapPattern.test(input)) {
      setError('LDAP must be numbers and start with 60');
      return;
    }
    if (team.includes(input)) {
      setError('This LDAP is already in the team');
      return;
    }
    setTeam([...team, input]);
    setInput('');
    setError('');
  };

  const handleRemove = (ldap: string) => {
    setTeam(team.filter(member => member !== ldap));
  };

  const tracker = useMainTracker();
  return (
    <>
    
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>Team Management</h2>
      {tracker && <YandexUserSelectConnected tracker={tracker} login='60073101' />}
      <div style={{ marginBottom: 16 }}>
        <p>{tracker ? JSON.stringify(tracker, null, 2) : 'No tracker'}</p>
        <input
          type="text"
          placeholder="Enter LDAP (e.g. 60073101)"
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ marginRight: 8, padding: 4 }}
        />
        <button onClick={handleAdd}>Add</button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <ul>
        {team.map(ldap => (
          <li key={ldap} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ flex: 1 }}>{ldap}</span>
            <button onClick={() => handleRemove(ldap)} style={{ marginLeft: 8 }}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
};
