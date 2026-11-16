// UA04 Suspend or reactivate account — BCE boundary class: AccountListPage
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Workspace from '../../components/Workspace';
import { PROFILE_LABELS, statusLabel, getCsrfToken } from './accountOptions';
import AccountsNav from './AccountsNav';
import '../../styles/admin.css';

export default function ManageAccounts({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [toast, setToast] = useState(location.state?.notice || '');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The change waiting for the admin's confirmation: { account, newStatus }
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const isAdmin = user?.role === 'user_admin';

  // Success message disappears after 3 seconds
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast('');
      navigate(location.pathname, { replace: true, state: null });
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast, navigate, location.pathname]);

  // Retrieve all accounts
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadAccounts() {
      try {
        const response = await fetch('/api/admin/users', {
          credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Unable to load accounts.');
        }

        if (active) setAccounts(result.data);
      } catch (err) {
        if (active) setError(err.message || 'Unable to load accounts.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAccounts();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  // Escape closes the confirmation dialog
  useEffect(() => {
    if (!pending) return;

    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) closeDialog();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending, busy]);

  function askToChange(account, newStatus) {
    setActionError('');
    setPending({ account, newStatus });
  }

  function closeDialog() {
    setPending(null);
    setActionError('');
  }

  // Acceptance criteria 1, 2 and 5: change only after confirming,
  // then show the new status in the list straight away
  async function confirmChange() {
    if (!pending || busy) return;

    const { account, newStatus } = pending;

    setBusy(true);
    setActionError('');

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `/api/admin/users/${account.id}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to change the status.');
      }

      setAccounts(current =>
        current.map(item =>
          item.id === account.id
            ? { ...item, accountStatus: result.data.accountStatus }
            : item
        )
      );

      setToast(`${account.name} is now ${statusLabel(newStatus)}`);
      setPending(null);
    } catch (err) {
      setActionError(err.message || 'Unable to change the status.');
    } finally {
      setBusy(false);
    }
  }

  function renderAction(account) {
    if (account.id === user?.id) {
      return <span className="muted">This is you</span>;
    }

    if (account.accountStatus === 'active') {
      return (
        <button
          type="button"
          className="admin-action-btn danger"
          onClick={() => askToChange(account, 'suspended')}
        >
          Suspend
        </button>
      );
    }

    if (account.accountStatus === 'suspended') {
      return (
        <button
          type="button"
          className="admin-action-btn"
          onClick={() => askToChange(account, 'active')}
        >
          Reactivate
        </button>
      );
    }

    return <span className="muted">No action</span>;
  }

  const suspending = pending?.newStatus === 'suspended';

  return (
    <Workspace label="User administration" title="User Accounts">
      <AccountsNav />

      {!isAdmin ? (
        <div className="panel">
          <p>Please log in as a user administrator to manage accounts.</p>

          <Link className="text-link" to="/login">
            Login
          </Link>
        </div>
      ) : (
        <>
          <p className="muted">
            Suspend an account to block misuse without deleting any data.
          </p>

          {toast && (
            <div className="admin-toast" role="status" aria-live="polite">
              <span aria-hidden="true">✓</span>
              <strong>{toast}</strong>
            </div>
          )}

          {error && (
            <p className="add-project-error" role="alert">
              {error}
            </p>
          )}

          <div className="panel">
            {loading ? (
              <p>Loading accounts...</p>
            ) : error ? null : accounts.length === 0 ? (
              <p>No accounts found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Profile</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map(account => (
                    <tr key={account.id}>
                      <td>{account.name}</td>
                      <td>{account.email}</td>
                      <td>
                        {PROFILE_LABELS[account.role] || account.role}
                      </td>
                      <td>
                        <span
                          className={`admin-status is-${account.accountStatus}`}
                        >
                          {statusLabel(account.accountStatus)}
                        </span>
                      </td>
                      <td>{renderAction(account)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pending && (
            <div
              className="admin-modal-backdrop"
              onClick={() => !busy && closeDialog()}
            >
              <div
                className="admin-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                onClick={event => event.stopPropagation()}
              >
                <h2 id="confirm-title">
                  {suspending ? 'Suspend account?' : 'Reactivate account?'}
                </h2>

                <p>
                  {suspending
                    ? `${pending.account.name} (${pending.account.email}) will no longer be able to log in. All of their data is kept.`
                    : `${pending.account.name} (${pending.account.email}) will be able to log in again.`}
                </p>

                {actionError && (
                  <p className="add-project-error" role="alert">
                    {actionError}
                  </p>
                )}

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    onClick={closeDialog}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={`pill${suspending ? ' admin-danger-pill' : ''}`}
                    onClick={confirmChange}
                    disabled={busy}
                  >
                    {busy
                      ? 'Saving...'
                      : suspending ? 'Yes, suspend' : 'Yes, reactivate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Workspace>
  );
}
