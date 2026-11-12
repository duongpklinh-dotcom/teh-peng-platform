// UA04 Suspend or reactivate account, US03 Update account, US05 Search and filter
// BCE boundary class: AccountListPage
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Workspace from '../../components/Workspace';
import { PROFILES, PROFILE_LABELS, statusLabel, getCsrfToken } from './accountOptions';
import AccountsNav from './AccountsNav';
import '../../styles/admin.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_FILTERS = ['active', 'suspended', 'locked'];

// Same rules as UpdateUserAccountController (acceptance criterion 3)
function validateEdit(form) {
  if (!form.name.trim()) return 'Please enter a name.';
  if (!form.email.trim()) return 'Please enter an email address.';
  if (!EMAIL_PATTERN.test(form.email.trim())) return 'Please enter a valid email address.';
  return '';
}

export default function ManageAccounts({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [toast, setToast] = useState(location.state?.notice || '');

  // US05: filters. The keyword is sent to the server shortly after typing stops.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // The latest answer from the server, tagged with the filters it belongs to
  const [result, setResult] = useState({ key: null, accounts: [], error: '' });

  // The change waiting for the admin's confirmation: { account, newStatus }
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // US03: the account being edited and its form
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const isAdmin = user?.role === 'user_admin';
  const queryKey = `${debouncedSearch}|${roleFilter}|${statusFilter}`;
  const filtersActive = Boolean(search.trim() || roleFilter || statusFilter);
  const firstLoad = result.key === null;
  const refreshing = result.key !== queryKey;
  const { accounts, error } = result;

  // Success message disappears after 3 seconds
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast('');
      navigate(location.pathname, { replace: true, state: null });
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast, navigate, location.pathname]);

  // Wait 300 ms after the last keystroke before searching
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Retrieve the accounts that match the filters (AC1 to AC4 of US05)
  useEffect(() => {
    if (!isAdmin) return undefined;

    let active = true;

    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (roleFilter) params.set('role', roleFilter);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load accounts.');
        return body.data;
      })
      .then(data => {
        if (active) setResult({ key: queryKey, accounts: data, error: '' });
      })
      .catch(err => {
        if (active) {
          setResult({ key: queryKey, accounts: [], error: err.message || 'Unable to load accounts.' });
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin, debouncedSearch, roleFilter, statusFilter, queryKey]);

  // Escape closes whichever dialog is open
  useEffect(() => {
    if (!pending && !editing) return;

    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      if (pending && !busy) closeDialog();
      if (editing && !editBusy) closeEdit();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending, busy, editing, editBusy]);

  // US05 AC5: clear the filters to see the full list again
  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setRoleFilter('');
    setStatusFilter('');
  }

  function updateRow(updated) {
    setResult(current => ({
      ...current,
      accounts: current.accounts.map(item =>
        item.id === updated.id ? { ...item, ...updated } : item
      )
    }));
  }

  // ----- UA04 suspend / reactivate -----

  function askToChange(account, newStatus) {
    setActionError('');
    setPending({ account, newStatus });
  }

  function closeDialog() {
    setPending(null);
    setActionError('');
  }

  async function confirmChange() {
    if (!pending || busy) return;

    const { account, newStatus } = pending;

    setBusy(true);
    setActionError('');

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`/api/admin/users/${account.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ status: newStatus })
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Unable to change the status.');
      }

      updateRow({ id: account.id, accountStatus: body.data.accountStatus });
      setToast(`${account.name} is now ${statusLabel(newStatus)}`);
      setPending(null);
    } catch (err) {
      setActionError(err.message || 'Unable to change the status.');
    } finally {
      setBusy(false);
    }
  }

  // ----- US03 update account details -----

  // AC1: the form opens pre-filled with the current details
  function openEdit(account) {
    setEditError('');
    setEditForm({ name: account.name, email: account.email });
    setEditing(account);
  }

  // AC5: closing without saving leaves the account unchanged
  function closeEdit() {
    setEditing(null);
    setEditError('');
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm(current => ({ ...current, [name]: value }));
    setEditError('');
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing || editBusy) return;

    const problem = validateEdit(editForm);

    if (problem) {
      setEditError(problem);
      return;
    }

    setEditBusy(true);
    setEditError('');

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(`/api/admin/users/${editing.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim()
        })
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Unable to update the account.');
      }

      // AC4: show the saved details in the list straight away
      updateRow({ id: editing.id, name: body.data.name, email: body.data.email });
      setToast(`Account updated for ${body.data.email}`);
      setEditing(null);
    } catch (err) {
      setEditError(err.message || 'Unable to update the account.');
    } finally {
      setEditBusy(false);
    }
  }

  function renderStatusAction(account) {
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

    return <span className="muted">No status action</span>;
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
            Search and filter accounts, fix incorrect details, or suspend an
            account to block misuse without deleting any data.
          </p>

          {toast && (
            <div className="admin-toast" role="status" aria-live="polite">
              <span aria-hidden="true">✓</span>
              <strong>{toast}</strong>
            </div>
          )}

          {/* US05 search and filters */}
          <div className="admin-filters" role="search">
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by name or email"
              aria-label="Search accounts by name or email"
              maxLength={100}
            />

            <select
              value={roleFilter}
              onChange={event => setRoleFilter(event.target.value)}
              aria-label="Filter by profile"
            >
              <option value="">All profiles</option>
              {PROFILES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUS_FILTERS.map(value => (
                <option key={value} value={value}>{statusLabel(value)}</option>
              ))}
            </select>

            {filtersActive && (
              <button type="button" className="admin-secondary-btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          {error && (
            <p className="add-project-error" role="alert">
              {error}
            </p>
          )}

          <div className="panel" aria-busy={refreshing}>
            {firstLoad ? (
              <p>Loading accounts...</p>
            ) : error ? null : accounts.length === 0 ? (
              <div className="admin-empty-state">
                <p>No accounts found.</p>
                {filtersActive && (
                  <button type="button" className="admin-secondary-btn" onClick={clearFilters}>
                    Clear filters to see all accounts
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="muted admin-results-count">
                  {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                  {filtersActive ? ' match your search' : ''}
                </p>

                <table className={refreshing ? 'admin-table-refreshing' : ''}>
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
                        <td>{PROFILE_LABELS[account.role] || account.role}</td>
                        <td>
                          <span className={`admin-status is-${account.accountStatus}`}>
                            {statusLabel(account.accountStatus)}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-action-btn"
                              onClick={() => openEdit(account)}
                            >
                              Edit
                            </button>
                            {renderStatusAction(account)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* US03 edit dialog */}
          {editing && (
            <div
              className="admin-modal-backdrop"
              onClick={() => !editBusy && closeEdit()}
            >
              <form
                className="admin-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-title"
                onClick={event => event.stopPropagation()}
                onSubmit={saveEdit}
                noValidate
              >
                <h2 id="edit-title">Edit account</h2>
                <p className="muted">
                  Profile and status are not changed here.
                </p>

                <div className="admin-modal-form">
                  <label>
                    Full name *
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleEditChange}
                      maxLength={100}
                      autoFocus
                    />
                  </label>

                  <label>
                    Email *
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      maxLength={254}
                    />
                  </label>
                </div>

                {editError && (
                  <p className="add-project-error" role="alert">
                    {editError}
                  </p>
                )}

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="admin-secondary-btn"
                    onClick={closeEdit}
                    disabled={editBusy}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="pill" disabled={editBusy}>
                    {editBusy ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

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
