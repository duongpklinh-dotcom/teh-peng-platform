// Tab bar shared by the User Accounts pages, so Create / Manage sit
// inside the User Accounts area instead of the account dropdown.
import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  ['/admin/accounts', 'User Accounts'],
  ['/admin/accounts/manage', 'Manage Accounts'],
  ['/admin/accounts/new', '+ Create Account']
];

export default function AccountsNav() {
  return (
    <nav className="admin-tabs" aria-label="User accounts sections">
      {TABS.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `admin-tab${isActive ? ' is-active' : ''}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
