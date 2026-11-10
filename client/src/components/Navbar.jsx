
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import SearchBar from './SearchBar';
import AccountDropdown from './AccountDropdown';
import NotificationBell from './NotificationBell';

export default function Navbar({ user, onLogout }) {
  const links = [
    ['Home', '/'],
    ['About Us', '/about'],
    ['Explore Projects', '/projects'],
    ['Interior Designers', '/designers'],
    ['Contact Us', '/contact']
  ];

  return (
    <header className="site-header">
      <Link className="brand" to="/">
        TP Interior<span className="brand-dot">.</span>
      </Link>

    

      <nav className="main-links" aria-label="Main website navigation">
        {links.map(([label, path]) => (
          <NavLink key={path} to={path} end={path === '/'}>
            {label}
          </NavLink>
        ))}
      </nav>

      <SearchBar />

      {user && <NotificationBell />}

      <AccountDropdown user={user} onLogout={onLogout} />
    </header>
  );
}


