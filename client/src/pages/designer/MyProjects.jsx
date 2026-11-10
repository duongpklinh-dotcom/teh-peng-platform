
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
  const [updatingId, setUpdatingId] = useState(null);
  const [publicationError, setPublicationError] = useState('');

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

   async function togglePublication(project) {
      if (updatingId) return;

      const newStatus = !project.isPublished;

      setUpdatingId(project.id);
      setPublicationError('');

      try {
        // Get CSRF token
        const tokenResponse = await fetch('/api/auth/csrf-token', {
          credentials: 'include'
        });

        const tokenResult = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error('Unable to verify request');
        }

        // Update publication status
        const response = await fetch(
          `/api/projects/mine/${project.id}/publication`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': tokenResult.data.csrfToken
            },
            body: JSON.stringify({
              isPublished: newStatus
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || 'Unable to update publication status'
          );
        }

        // Update the table after MongoDB confirms success
        setProjects(current =>
          current.map(item =>
            item.id === project.id
              ? { ...item, isPublished: newStatus }
              : item
          )
        );

      } catch (err) {
        setPublicationError(
          err.message || 'Unable to update publication status'
        );
      } finally {
        setUpdatingId(null);
      }
    }

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

      {publicationError && (
      <p role="alert" className="add-project-error">
        {publicationError}
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
                <th>Pulication</th>
                <th>Date Created</th>
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
                    <div className="project-publication">
                      <button
                        type="button"
                        role="switch"
                        className={`publication-toggle ${
                          project.isPublished ? 'is-published' : ''
                        }`}
                        aria-checked={Boolean(project.isPublished)}
                        aria-label={`Publish ${project.title}`}
                        title={project.isPublished
                          ? 'Unpublish project'
                          : 'Publish project'}
                        onClick={() => {
                          console.log('Publication toggle clicked:', project.title);
                          togglePublication(project);
                        }}
                        disabled={updatingId !== null}
                      >
                        <span className="publication-toggle-knob" />
                      </button>

                      <span className="publication-status-label">
                        {updatingId === project.id
                          ? 'Updating...'
                          : project.isPublished
                            ? 'Published'
                            : 'Unpublished'}
                      </span>
                    </div>
                  </td>

                  <td>
                    {project.createdAt &&
                    !Number.isNaN(new Date(project.createdAt).getTime())
                      ? new Date(project.createdAt).toLocaleDateString('en-SG', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'Asia/Singapore'
                        })
                      : '—'}
                  </td>
                  

                  
                  <td>
                    <div className="project-row-actions">

                      {/* VIEW ICON — visual only */}
                      <span
                        className="project-action-btn"
                        title="View project"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </span>

                      {/* EDIT ICON — functional */}
                      <Link
                        className="project-action-btn"
                        to={`/designer/projects/${project.id}/edit`}
                        title="Edit project"
                        aria-label={`Edit ${project.title}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
                        </svg>
                      </Link>

                      {/* THREE-DOT MENU */}
                      <details className="project-actions-menu">
                        <summary
                          className="project-action-btn"
                          aria-label={`More actions for ${project.title}`}
                          title="More actions"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24"
                            fill="currentColor" aria-hidden="true">
                            <circle cx="5" cy="12" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="19" cy="12" r="1.8" />
                          </svg>
                        </summary>

                        <div className="project-actions-dropdown">

                          {/* VIEW PROJECT — visual only */}
                          <div className="project-menu-item">
                            <svg width="17" height="17" viewBox="0 0 24 24"
                              fill="none" stroke="currentColor" strokeWidth="1.8"
                              strokeLinecap="round" strokeLinejoin="round"
                              aria-hidden="true">
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View project</span>
                          </div>

                          {/* EDIT PROJECT — functional */}
                          <Link
                            className="project-menu-item"
                            to={`/designer/projects/${project.id}/edit`}
                          >
                            <svg width="17" height="17" viewBox="0 0 24 24"
                              fill="none" stroke="currentColor" strokeWidth="1.8"
                              strokeLinecap="round" strokeLinejoin="round"
                              aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
                            </svg>
                            <span>Edit project</span>
                          </Link>

                          {/* DELETE PROJECT — visual only */}
                          <div className="project-menu-item project-menu-danger">
                            <svg width="17" height="17" viewBox="0 0 24 24"
                              fill="none" stroke="currentColor" strokeWidth="1.8"
                              strokeLinecap="round" strokeLinejoin="round"
                              aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M5 6l1 15h12l1-15" />
                              <path d="M10 10v7M14 10v7" />
                            </svg>
                            <span>Delete project</span>
                          </div>

                        </div>
                      </details>

                    </div>
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
