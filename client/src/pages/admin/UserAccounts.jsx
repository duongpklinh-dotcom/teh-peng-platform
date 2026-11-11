
import React, { useEffect, useState } from 'react';
import Workspace from '../../components/Workspace';

const emptyForm = {
  name: '',
  email: '',
  tempPassword: '',
  role: 'customer'
};

export default function UserAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadAccounts() {
    const response = await fetch('/api/admin/users', {
      credentials: 'include'
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Unable to load accounts');
    }

    setAccounts(result.data);
  }

  useEffect(() => {
    loadAccounts()
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function adminRequest(url, method, body) {
    const tokenResponse = await fetch('/api/auth/csrf-token', {
      credentials: 'include'
    });
    const tokenResult = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error('Unable to get security token');
    }

    const response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': tokenResult.data.csrfToken
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  }

  async function createAccount(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      await adminRequest('/api/admin/users', 'POST', form);
      setForm(emptyForm);
      await loadAccounts();
      setMessage('Account created successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(account) {
    const status =
      account.accountStatus === 'active'
        ? 'suspended'
        : 'active';

    if (!window.confirm(`${status === 'suspended' ? 'Suspend' : 'Reactivate'} ${account.name}?`)) {
      return;
    }

    setError('');
    setMessage('');
    setBusy(true);

    try {
      await adminRequest(
        `/api/admin/users/${account.id}/status`,
        'PATCH',
        { status }
      );

      await loadAccounts();
      setMessage(`Account ${status} successfully.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = accounts.filter(account =>
    [account.name, account.email, account.role]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Workspace label="User administration" title="User Accounts">
      <div className="panel">
        <h3>Manage Accounts</h3>

        {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
        {message && <p role="status">{message}</p>}

        <input
          type="search"
          placeholder="Search users by name, email or role"
          value={search}
          onChange={event => setSearch(event.target.value)}
          style={{ width: '100%', marginBottom: 20 }}
        />

        {loading ? (
          <p>Loading accounts...</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.map(account => (
              <div
                key={account.id}
                style={{
                  padding: 16,
                  border: '1px solid #ddd4c8',
                  borderRadius: 10
                }}
              >
                <strong>{account.name}</strong>
                <p>{account.email}</p>
                <p>
                  {account.role} · {account.accountStatus}
                </p>

                {['active', 'suspended'].includes(account.accountStatus) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeStatus(account)}
                  >
                    {account.accountStatus === 'active'
                      ? 'Suspend Account'
                      : 'Reactivate Account'}
                  </button>
                )}
              </div>
            ))}

            {filtered.length === 0 && <p>No accounts found.</p>}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h3>Create User Account</h3>

        <form onSubmit={createAccount} style={{ display: 'grid', gap: 14 }}>
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={event =>
              setForm({ ...form, name: event.target.value })
            }
          />

          <input
            required
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={event =>
              setForm({ ...form, email: event.target.value })
            }
          />

          <input
            required
            type="password"
            minLength={12}
            autoComplete="new-password"
            placeholder="Temporary password (minimum 12 characters)"
            value={form.tempPassword}
            onChange={event =>
              setForm({ ...form, tempPassword: event.target.value })
            }
          />

          <select
            value={form.role}
            onChange={event =>
              setForm({ ...form, role: event.target.value })
            }
          >
            <option value="customer">Customer</option>
            <option value="interior_designer">Interior Designer</option>
            <option value="platform_management">Platform Management</option>
            <option value="user_admin">User Admin</option>
          </select>

          <button type="submit" disabled={busy}>
            {busy ? 'Processing...' : 'Create Account'}
          </button>
        </form>
      </div>
    </Workspace>
  );
}
