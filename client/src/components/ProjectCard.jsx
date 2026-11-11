
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function ProjectCard({
  project,
  onSave,
  onCompare,
  isCompared = false
}) {
  const location = useLocation();

  const detailsPath = `/projects/${project.id}`;

  const returnTo =
    location.state?.from ||
    `${location.pathname}${location.search}`;

  const linkState = {
    from: returnTo
  };

  return (
    <article className="project-card">
      <Link to={detailsPath} state={linkState}>
        {project.image ? (
          <img src={project.image} alt={project.title} />
        ) : (
          <div
            style={{
              minHeight: '180px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#f3eee9',
              color: '#6b4228'
            }}
          >
            No image available
          </div>
        )}
      </Link>

      <div className="project-card-copy">
        <span className="eyebrow">
          {[project.category, project.style]
            .filter(Boolean)
            .join(' · ')}
        </span>

        <h3>
          <Link to={detailsPath} state={linkState}>
            {project.title}
          </Link>
        </h3>

        <p>By {project.designer || 'Designer unavailable'}</p>

        <div className="card-actions">
          <Link
            className="text-link"
            to={detailsPath}
            state={linkState}
          >
            View details ↗
          </Link>

          {onSave && (
            <button
              type="button"
              onClick={() => onSave(project.id)}
            >
              ♡ Save
            </button>
          )}

          {onCompare && (
            <button
              type="button"
              className={
                isCompared
                  ? 'compare-button selected'
                  : 'compare-button'
              }
              onClick={() => onCompare(project.id)}
              aria-pressed={isCompared}
            >
              {isCompared ? '✓ Selected' : '+ Compare'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
