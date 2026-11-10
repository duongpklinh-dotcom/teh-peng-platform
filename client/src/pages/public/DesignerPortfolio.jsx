
import React, { useEffect, useState } from 'react';

import {
  Link,
  useParams
} from 'react-router-dom';

import ProjectCard from '../../components/ProjectCard';

import {
  getLocalDesignerPortfolio
} from '../../data/sampleProjectDetails';

export default function DesignerPortfolio() {
  const { id } = useParams();

  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const abortController = new AbortController();

    async function loadPortfolio() {
      setLoading(true);
      setError('');
      setPortfolio(null);

      // STEP 1: Look for a local sample studio.
      const localPortfolio = getLocalDesignerPortfolio(id);

      if (localPortfolio) {
        setPortfolio(localPortfolio);
        setLoading(false);
        return;
      }

      // An unknown local studio should not be sent to MongoDB.
      if (!/^[0-9a-fA-F]{24}$/.test(id || '')) {
        setError('Designer portfolio unavailable.');
        setLoading(false);
        return;
      }

      // STEP 2: Retrieve a MongoDB designer portfolio.
      try {
        const response = await fetch(
          `/api/projects/designers/${encodeURIComponent(id)}`,
          {
            credentials: 'include',
            signal: abortController.signal
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
            'Designer portfolio unavailable.'
          );
        }

        if (!abortController.signal.aborted) {
          setPortfolio(result.data);
        }

      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(
            err.message ||
            'Unable to retrieve designer portfolio.'
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPortfolio();

    return () => abortController.abort();
  }, [id]);

  if (loading) {
    return (
      <div className="page section">
        <p role="status">
          Loading designer portfolio...
        </p>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="page section">
        <h1>Designer Portfolio Unavailable</h1>

        <p role="alert">
          {error || 'Portfolio information is unavailable.'}
        </p>

        <Link className="pill" to="/projects">
          Browse Projects
        </Link>
      </div>
    );
  }

  const {
    designer,
    company,
    projects = [],
    isSample
  } = portfolio;

  return (
    <div className="page section">

      <Link className="text-link" to="/projects">
        ← Back to Projects
      </Link>

      {/* DESIGNER HEADER */}
      <header
        style={{
          marginTop: '35px',
          marginBottom: '45px'
        }}
      >
        <span className="eyebrow">
          Interior Designer Portfolio
        </span>

        <h1 style={{ marginTop: '12px' }}>
          {designer.name}
        </h1>

        {isSample && (
          <p
            style={{
              opacity: 0.7,
              fontSize: '13px'
            }}
          >
            Fictional sample studio profile
          </p>
        )}

        {designer.specialisation && (
          <p className="muted">
            {designer.specialisation}
          </p>
        )}

        <p
          style={{
            lineHeight: 1.8,
            maxWidth: '800px'
          }}
        >
          {designer.profileDescription ||
            'Designer profile information is currently unavailable.'}
        </p>
      </header>

      {/* COMPANY INFORMATION */}
      <section
        id="company-information"
        style={{
          marginBottom: '50px',
          padding: '28px',
          border: '1px solid #e6e0d7',
          borderRadius: '12px'
        }}
      >
        <span className="eyebrow">
          Design Studio
        </span>

        <h2>About the Company</h2>

        {company ? (
          <>
            <h3>{company.companyName}</h3>

            {company.companyDescription && (
              <p style={{ lineHeight: 1.8 }}>
                {company.companyDescription}
              </p>
            )}

            {company.specialisation && (
              <p>
                <strong>Specialisation:</strong>{' '}
                {company.specialisation}
              </p>
            )}

            {company.location && (
              <p>
                <strong>Location:</strong>{' '}
                {company.location}
              </p>
            )}
          </>
        ) : (
          <p>
            Company information is currently unavailable.
          </p>
        )}
      </section>

      {/* DESIGNER PROJECTS */}
      <section id="portfolio-projects">
        <span className="eyebrow">
          Selected Works
        </span>

        <h2>Portfolio Projects</h2>

        <p className="muted">
          {projects.length} available projects
        </p>

        {projects.length > 0 ? (
          <div className="project-grid">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  designer: designer.name
                }}
              />
            ))}
          </div>
        ) : (
          <p>
            No portfolio projects are currently available.
          </p>
        )}
      </section>

      {/* CONSULTATION NAVIGATION */}
      <div style={{ marginTop: '45px' }}>
        <Link
          className="pill"
          to="/consultation"
        >
          Book Consultation ↗
        </Link>
      </div>
    </div>
  );
}
