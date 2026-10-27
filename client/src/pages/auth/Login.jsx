
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login({ register = false, onLogin }) {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get a CSRF token and its associated session cookie.
      const tokenResponse = await fetch('/api/auth/csrf-token', {
        credentials: 'include'
      });

      if (!tokenResponse.ok) {
        throw new Error('Unable to start authentication');
      }

      const tokenResult = await tokenResponse.json();
      const csrfToken = tokenResult.data.csrfToken;

      const endpoint = register
        ? '/api/auth/register'
        : '/api/auth/login';

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify(
          register
            ? { name, email, password }
            : { email, password }
        )
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      if (register) {
        // Registration creates an account but does not log in.
        navigate('/login', { replace: true });
      } else {
        onLogin(result.data);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page section auth-page">
      <span className="eyebrow">Account</span>
      <h1>{register ? 'Create an Account' : 'Login'}</h1>

      <form className="panel form-stack auth-form" onSubmit={handleSubmit}>
        {register && (
          <label>
            Full Name
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            minLength={register ? 12 : undefined}
            required
          />
        </label>

        {register && (
          <p className="muted">
            Password must contain at least 12 characters.
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: 'crimson' }}>
            {error}
          </p>
        )}

        <button type="submit" className="pill auth-submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : register ? 'Create Account' : 'Login'}
        </button>

        <Link
          className="text-link"
          to={register ? '/login' : '/register'}
        >
          {register
            ? 'Already have an account? Login'
            : 'Create an account'}
        </Link>
      </form>
    </div>
  );
}
