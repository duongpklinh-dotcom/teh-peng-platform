
import React, { useEffect, useState } from 'react';
import Workspace from '../../components/Workspace';

export default function LoginHistory() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch('/api/admin/login-history', {
          credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Unable to load login history');
        }

        setHistory(result.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const filtered = history.filter(record =>
    (record.email || '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Workspace label="User administration" title="Account Login History">
      <div className="panel">
        <h3>Recent Login Activity</h3>

        <input
          type="search"
          placeholder="Search by email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', marginBottom: 20 }}
        />

        {loading && <p>Loading login history...</p>}
        {error && <p role="alert">{error}</p>}

        {!loading && !error && (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map(record => (
              <div
                key={record.id}
                style={{
                  padding: 16,
                  border: '1px solid #ddd4c8',
                  borderRadius: 10
                }}
              >
                <strong>{record.email || 'Unknown user'}</strong>
                <p>
                  Status: {record.status === 'success'
                    ? 'Successful'
                    : 'Failed'}
                </p>
                <p>
                  {new Date(record.createdAt).toLocaleString('en-SG')}
                </p>
              </div>
            ))}

            {filtered.length === 0 && (
              <p>No login records found.</p>
            )}
          </div>
        )}
      </div>
    </Workspace>
  );
}
