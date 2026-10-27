
import React from 'react';
import { Link } from 'react-router-dom';

export default function ProjectCard({
  project,
  onSave,
  onCompare,
  isCompared = false
}) {
  return (
    <article className="project-card">
      <Link to={'/projects/' + project.id}>
        <img src={project.image} alt={project.title} />
      </Link>

      <div className="project-card-copy">
        <span className="eyebrow">
          {project.category} · {project.style}
        </span>

        <h3>
          <Link to={'/projects/' + project.id}>
            {project.title}
          </Link>
        </h3>

        <p>By {project.designer}</p>

        <div className="card-actions">
          <Link
            className="text-link"
            to={'/projects/' + project.id}
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
              className={isCompared ? 'compare-button selected' : 'compare-button'}
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
