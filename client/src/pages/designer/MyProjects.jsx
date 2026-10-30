
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Workspace from '../../components/Workspace';

export default function MyProjects() {
  const location = useLocation();


const navigate = useNavigate();
const [toast, setToast] = useState(location.state?.notice || '');

useEffect(() => {
  if (!toast) return;

  const timer = setTimeout(() => {
    setToast('');

    // Clear the notification from navigation history
    navigate(location.pathname, {
      replace: true,
      state: null
    });
  }, 3000);

  return () => clearTimeout(timer);
}, [toast, navigate, location.pathname]);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        const response = await fetch('/api/projects/mine', {
          credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || 'Unable to load projects'
          );
        }

        if (active) {
          setProjects(result.data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load projects');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Workspace
      label="Interior designer"
      title="My Projects"
    >
      <div className="section-heading">
        <p className="muted">
          Manage your interior design projects.
        </p>

        <Link
          className="pill"
          to="/designer/projects/new"
        >
          + Add New Project
        </Link>
      </div>

      {/* Success confirmation */}
      
        {toast && (
        <div
            role="status"
            aria-live="polite"
            style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            background: '#ffffff',
            padding: '28px 36px',
            borderRadius: '16px',
            boxShadow: '0 12px 45px rgba(0, 0, 0, 0.18)',
            border: '1px solid #e4ded6',
            textAlign: 'center',
            width: 'min(340px, 90vw)'
            }}
        >
            <div
            aria-hidden="true"
            style={{
                fontSize: '34px',
                color: '#5c8358',
                marginBottom: '10px'
            }}
            >
            ✓
            </div>

            <strong
            style={{
                display: 'block',
                fontSize: '17px',
                color: '#292420'
            }}
            >
            {toast}
            </strong>

            <p
            style={{
                fontSize: '13px',
                margin: '8px 0 0',
                color: '#857a6f'
            }}
            >
            Your project has been saved.
            </p>
        </div>
        )}


      {error && (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      )}

      {/* Project listing */}
      <div className="panel">
        {loading ? (
          <p>Loading projects...</p>
        ) : error ? null : projects.length === 0 ? (
          <p>
            No projects yet. Add your first project
            to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Style</th>
                <th>Featured</th>
                <th>Visibility</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td>{project.title}</td>
                  <td>{project.style || '—'}</td>
                  <td>
                    {project.featured ? 'Yes' : 'No'}
                  </td>
                  <td>
                    {project.isPublished
                      ? 'Published'
                      : 'Unpublished'}
                  </td>
                  <td>
                    <Link
                      className="text-link"
                      to={`/designer/projects/${project.id}/edit`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Workspace>
  );
}
