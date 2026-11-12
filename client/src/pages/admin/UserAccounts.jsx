import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Workspace from '../../components/Workspace';
import AccountsNav from './AccountsNav';


async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf-token', { credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to start secure request');
  return result.data.csrfToken;
}

export default function UserAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadAccounts = useCallback(async (term = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/accounts?search=${encodeURIComponent(term)}`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load accounts');
      setAccounts(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(''); }, [loadAccounts]);

  async function unlockAccount(account) {
    if (!window.confirm(`Unlock the account for ${account.email}?`)) return;
    setBusyId(account.id);
    setError('');
    setMessage('');
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/admin/accounts/${account.id}/unlock`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to unlock account');
      setMessage(`Account ${account.email} has been unlocked.`);
      await loadAccounts(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <Workspace label="User administration" title="User Accounts">
      <AccountsNav />

      <div className="panel admin-panel">
        <div className="section-heading admin-heading">
          <div>
            <h2>Account Overview</h2>
            <p className="muted">Review account status and restore access to locked accounts.</p>
          </div>
          <span className="admin-count">{accounts.length} accounts</span>
        </div>

        <form className="admin-toolbar" onSubmit={event => { event.preventDefault(); loadAccounts(search); }}>
          <input
            aria-label="Search accounts"
            placeholder="Search by name or email"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <button className="pill" type="submit">Search</button>
        </form>

        {message && <p className="admin-success" role="status">{message}</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {loading ? <p className="muted">Loading accounts...</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Failed attempts</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr><td colSpan="5" className="admin-empty">No accounts found.</td></tr>
                ) : accounts.map(account => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name || 'Unnamed user'}</strong>
                      <span className="admin-subtext">{account.email}</span>
                    </td>
                    <td>{(account.role || 'customer').replaceAll('_', ' ')}</td>
                    <td>
                      <span className={`admin-status ${account.accountStatus === 'locked' ? 'is-locked' : 'is-active'}`}>
                        {account.accountStatus || 'active'}
                      </span>
                    </td>
                    <td>{account.failedLoginAttempts}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Link className="text-link" to={`/admin/login-history?search=${encodeURIComponent(account.email)}`}>
                          View history
                        </Link>
                        {account.accountStatus === 'locked' ? (
                          <button
                            type="button"
                            className="pill admin-action"
                            disabled={busyId === account.id}
                            onClick={() => unlockAccount(account)}
                          >
                            {busyId === account.id ? 'Unlocking...' : 'Unlock account'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Workspace>
  );
}