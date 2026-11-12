
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Workspace from '../../components/Workspace';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function LoginHistory() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [outcome, setOutcome] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (term = '', resultType = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (term.trim()) params.set('search', term.trim());
      if (resultType) params.set('outcome', resultType);
      const response = await fetch(`/api/admin/login-history?${params.toString()}`, {
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();

        throw new Error(
          `Expected JSON but received HTML or another response. Status: ${response.status}. Response: ${responseText.slice(0, 200)}`
        );
  }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load login history');
      setEvents(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(initialSearch, ''); }, [loadHistory, initialSearch]); // Load the initial history, optionally scoped to one account.

  return (
    <Workspace label="User administration" title="Account Login History">
      <div className="panel admin-panel">
        <div className="section-heading admin-heading">
          <div>
            <h2>Recent login activity</h2>
            <p className="muted">Review successful sign-ins, failed attempts, blocked access and administrator unlocks.</p>
          </div>
          <span className="admin-count">{events.length} events</span>
        </div>

        <form className="admin-toolbar" onSubmit={event => { event.preventDefault(); loadHistory(search, outcome); }}>
          <input
            aria-label="Search login history"
            placeholder="Search by account email or user ID"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <select aria-label="Filter by outcome" value={outcome} onChange={event => setOutcome(event.target.value)}>
            <option value="">All activity</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
            <option value="admin_unlock">Administrator unlocks</option>
          </select>
          <button className="pill" type="submit">Apply filters</button>
        </form>

        {error && <p className="admin-error" role="alert">{error}</p>}
        {loading ? <p className="muted">Loading login history...</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Date &amp; time</th><th>Account</th><th>Result</th><th>Details</th></tr></thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan="4" className="admin-empty">No login activity found. New events will appear here when users sign in.</td></tr>
                ) : events.map(event => (
                  <tr key={event.id}>
                    <td>{formatDate(event.createdAt)}</td>
                    <td>{event.email || 'Unknown account'}<span className="admin-subtext">{event.userId || 'No matching account ID'}</span></td>
                    <td><span className={`admin-status ${event.outcome === 'success' ? 'is-active' : event.outcome === 'admin_unlock' ? 'is-unlock' : 'is-locked'}`}>{(event.outcome || 'unknown').replaceAll('_', ' ')}</span></td>
                    <td>{event.reason || 'Successful authentication'}<span className="admin-subtext">{event.userAgent}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted admin-footnote">Showing up to the latest 300 matching events.</p>
      </div>
    </Workspace>
  );
}
