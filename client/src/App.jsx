import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/public/Home';
import About from './pages/public/About';
import ExploreProjects from './pages/public/ExploreProjects';
import ProjectDetails from './pages/public/ProjectDetails';
import InteriorDesigners from './pages/public/InteriorDesigners';
import DesignerPortfolio from './pages/public/DesignerPortfolio';
import Contact from './pages/public/Contact';
import MyAccount from './pages/customer/MyAccount';
import MyFavourites from './pages/customer/MyFavourites';
import MyConsultations from './pages/customer/MyConsultations';
import BookConsultation from './pages/customer/BookConsultation';
import ProfileSettings from './pages/customer/ProfileSettings';
import Login from './pages/auth/Login';
import MyProjects from './pages/designer/MyProjects';
import EditProject from './pages/designer/EditProject';
import FeaturedProjects from './pages/designer/FeaturedProjects';
import DesignerConsultations from './pages/designer/DesignerConsultations';
import Categories from './pages/management/Categories';
import WeeklyReports from './pages/management/WeeklyReports';
import UserAccounts from './pages/admin/UserAccounts';
import LoginHistory from './pages/admin/LoginHistory';
import CreateAccount from './pages/admin/CreateAccount';
import ManageAccounts from './pages/admin/ManageAccounts';
import AddProject from './pages/designer/AddProject';

async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf-token', {
    credentials: 'include'
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Unable to get security token');
  }

  return result.data.csrfToken;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (active) setUser(result.data);
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkSession();
    return () => { active = false; };
  }, []);

  async function handleLogout() {
    const csrfToken = await getCsrfToken();

    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': csrfToken }
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    setUser(null);
    setSaved([]);
  }

  function onSave(id) {
    if (!user) {
      alert('Please log in to save projects.');
      return;
    }

    if (user.role !== 'customer') {
      alert('Only customers can save favourite projects.');
      return;
    }

    // Temporary demo favourites until the favourites API is implemented.
    setSaved(ids => ids.includes(id) ? ids : [...ids, id]);
    alert('Added to demo favourites');
  }

  return (
    <BrowserRouter>
      <Navbar
        user={user}
        onLogout={handleLogout}
      />

      <main id="main-content">
        {checkingSession ? (
          <div className="page section">Loading account...</div>
        ) : (
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<ExploreProjects onSave={onSave} />} />
            <Route path="/projects/:id" element={<ProjectDetails onSave={onSave} />} />
            <Route path="/designers" element={<InteriorDesigners />} />
            <Route path="/designers/:id" element={<DesignerPortfolio />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/consultation" element={<BookConsultation />} />

            {/* Authentication */}
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="/register" element={<Login register onLogin={setUser} />} />

            {/* Customer routes */}
            <Route path="/account" element={<MyAccount />} />
            <Route path="/account/favourites" element={<MyFavourites saved={saved} setSaved={setSaved} />} />
            <Route path="/account/consultations" element={<MyConsultations />} />
            <Route path="/account/profile" element={<ProfileSettings />} />

            {/* Existing designer routes */}
            <Route path="/designer/projects" element={<MyProjects />} />
            <Route path="/designer/projects/new" element={<AddProject user={user} />} />

            <Route path="/designer/projects/:id/edit" element={<EditProject user={user} />} />
            <Route path="/designer/featured" element={<FeaturedProjects />} />

            {/* New consultation management dashboard */}
            <Route
              path="/designer/consultations"
              element={
                user?.role === 'interior_designer' ? (
                  <DesignerConsultations user={user} />
                ) : (
                  <Navigate
                    to={user ? '/' : '/login'}
                    replace
                  />
                )
              }
            />

            {/* Management routes */}
            <Route path="/management/categories" element={<Categories user={user} />} />
            <Route path="/management/reports" element={<WeeklyReports user={user} />} />

            {/* Admin routes */}
            <Route path="/admin/accounts" element={user?.role === 'user_admin' ? <UserAccounts /> : <Navigate to="/" replace />} />
            <Route path="/admin/accounts/new" element={<CreateAccount user={user} />} />
            <Route path="/admin/accounts/manage" element={<ManageAccounts user={user} />} />
            <Route path="/admin/login-history" element={user?.role === 'user_admin' ? <LoginHistory /> : <Navigate to="/" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      <Footer />
    </BrowserRouter>
  );
}