
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const menu = {
  guest: [
    ['Login', '/login'],
    ['Register', '/register']
  ],
  customer: [
    ['My Account', '/account'],
    ['My Favourites', '/account/favourites'],
    ['My Consultations', '/account/consultations'],
    ['Profile Settings', '/account/profile']
  ],
  interior_designer: [
    ['My Projects', '/designer/projects'],
    ['Featured Projects', '/designer/featured'],
    ['Profile Settings', '/account/profile']
  ],
  platform_management: [
    ['Manage IDP Categories', '/management/categories'],
    ['Weekly Reports', '/management/reports']
  ],
  user_admin: [
    ['User Accounts', '/admin/accounts'],
    ['Login History', '/admin/login-history']
  ]
};

const roleLabels = {
  customer: 'Customer',
  interior_designer: 'Interior Designer',
  platform_management: 'Platform Management',
  user_admin: 'User Administrator'
};

export default function AccountDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const role = user?.role || 'guest';
  const links = menu[role] || [];

  async function handleLogout() {
    setLoggingOut(true);
    setError('');

    try {
      await onLogout();
      setOpen(false);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Unable to log out');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="account-menu">
      <button
        type="button"
        className="account-toggle"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        ◯ {user ? user.name : 'Login / Register'} ▾
      </button>

      {open && (
        <div className="dropdown">
          <small>
            {user
              ? `${user.name} — ${roleLabels[role] || role}`
              : 'Guest'}
          </small>

          {links.map(([label, to]) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          )}

          {error && <small role="alert">{error}</small>}
        </div>
      )}
    </div>
  );
}
