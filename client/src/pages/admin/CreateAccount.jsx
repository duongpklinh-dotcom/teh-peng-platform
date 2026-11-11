// UA01 Create user account — BCE boundary class: CreateAccountPage
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Workspace from '../../components/Workspace';
import { PROFILES, getCsrfToken } from './accountOptions';
import '../../styles/admin.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

const initialForm = {
  name: '',
  email: '',
  tempPassword: '',
  role: ''
};

// Random temporary password so the admin does not have to invent one
function generatePassword() {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);

  return Array.from(values, value => chars[value % chars.length]).join('');
}

// Acceptance criterion 2: reject empty fields and an invalid email
function validate(form) {
  if (!form.name.trim()) return 'Please enter the full name.';
  if (!form.email.trim()) return 'Please enter an email address.';
  if (!EMAIL_PATTERN.test(form.email.trim())) {
    return 'Please enter a valid email address.';
  }
  if (!form.tempPassword) return 'Please enter a temporary password.';
  if (form.tempPassword.length < MIN_PASSWORD_LENGTH) {
    return `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!form.role) return 'Please select a profile.';

  return '';
}

export default function CreateAccount({ user }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(current => ({ ...current, [name]: value }));
    setError('');
  }

  function handleGenerate() {
    setForm(current => ({ ...current, tempPassword: generatePassword() }));
    setShowPassword(true);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const problem = validate(form);

    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          tempPassword: form.tempPassword,
          role: form.role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to create the account.');
      }

      // Acceptance criterion 5: success message and the account in the list
      navigate('/admin/accounts/manage', {
        replace: true,
        state: { notice: `Account created for ${result.data.email}` }
      });
    } catch (err) {
      setError(err.message || 'Unable to create the account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-project-page">
      <Workspace label="User administration" title="Create User Account">
        {user?.role !== 'user_admin' ? (
          <div className="panel add-project-form">
            <p>Please log in as a user administrator to create accounts.</p>

            <Link className="text-link" to="/login">
              Login
            </Link>
          </div>
        ) : (
          <form
            className="panel form-stack add-project-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <p className="muted">
              Create an account for a new customer, interior designer or
              staff member. New accounts are saved as active.
            </p>

            <section className="add-project-group">
              <h2>Account Details</h2>

              <div className="add-project-grid">
                <label className="add-project-wide">
                  Full name *
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Alice Tan"
                    maxLength={120}
                    autoComplete="off"
                  />
                </label>

                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    autoComplete="off"
                  />
                </label>

                <label>
                  Profile *
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="">Select profile</option>
                    {PROFILES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="add-project-wide">
                  Temporary password *
                  <div className="admin-password-row">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="tempPassword"
                      value={form.tempPassword}
                      onChange={handleChange}
                      placeholder="At least 12 characters"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="admin-secondary-btn"
                      onClick={() => setShowPassword(value => !value)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>

                    <button
                      type="button"
                      className="admin-secondary-btn"
                      onClick={handleGenerate}
                    >
                      Generate
                    </button>
                  </div>
                  <small>
                    Give this password to the user. It is stored securely
                    and cannot be viewed again.
                  </small>
                </label>
              </div>
            </section>

            {error && (
              <p className="add-project-error" role="alert">
                {error}
              </p>
            )}

            <div className="add-project-actions">
              <Link className="text-link" to="/admin/accounts/manage">
                Cancel
              </Link>

              <button className="pill" type="submit" disabled={saving}>
                {saving ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </Workspace>
    </div>
  );
}
