
import React, { useEffect, useState } from 'react';

import {
  Link,
  useLocation,
  useParams
} from 'react-router-dom';

import ProjectCard from '../../components/ProjectCard';

/*
 * US-02: View Interior Design Project Details
 *
 * Designer Portfolio
 *
 * All designer portfolios are retrieved from MongoDB.
 *
 * Supports:
 * - Registered interior designers
 * - Demo designer profiles without user accounts
 * - Associated design companies
 * - Published portfolio projects
 * - Missing designer and company information
 */

export default function DesignerPortfolio() {
  const { id } = useParams();
  const location = useLocation();

  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Preserve navigation back to the selected project.
  const returnPath =
    typeof location.state?.from === 'string' &&
    location.state.from.startsWith('/') &&
    !location.state.from.startsWith('//')
      ? location.state.from
      : '/projects';

  // --------------------------------------------
  // RETRIEVE DESIGNER PORTFOLIO FROM MONGODB
  // --------------------------------------------

  useEffect(() => {
    const abortController = new AbortController();

    async function loadPortfolio() {
      setLoading(true);
      setError('');
      setPortfolio(null);

      // All designer IDs must be MongoDB ObjectIds.
      if (!/^[0-9a-fA-F]{24}$/.test(id || '')) {
        setError('Designer portfolio unavailable.');
        setLoading(false);
        return;
      }

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

        if (!result.data?.designer) {
          throw new Error(
            'Designer information is unavailable.'
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

  // --------------------------------------------
  // LOADING STATE
  // --------------------------------------------

  if (loading) {
    return (
      <div className="page section">
        <p role="status">
          Loading designer portfolio...
        </p>
      </div>
    );
  }

  // --------------------------------------------
  // ERROR STATE
  // --------------------------------------------

  if (error || !portfolio) {
    return (
      <div className="page section">
        <h1>Designer Portfolio Unavailable</h1>

        <p role="alert">
          {error ||
            'Portfolio information is unavailable.'}
        </p>

        <Link className="pill" to={returnPath}>
          ← Back to Projects
        </Link>
      </div>
    );
  }

  // --------------------------------------------
  // PORTFOLIO DATA
  // --------------------------------------------

  const designer = portfolio.designer;
  const company = portfolio.company;

  const projects = Array.isArray(portfolio.projects)
    ? portfolio.projects
    : [];

  // The backend identifies demo designer profiles
  // using designer.isDemo.
  const isDemo = designer?.isDemo === true;

  // --------------------------------------------
  // DESIGNER PORTFOLIO PAGE
  // --------------------------------------------

  return (
    <div className="page section">

      {/* BACK NAVIGATION */}

      <Link
        className="text-link"
        to={returnPath}
      >
        ← Back to Previous Page
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
          {designer.name || 'Interior Designer'}
        </h1>

        {isDemo && (
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
            <h3>
              {company.companyName ||
                'Design company'}
            </h3>

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

      {/* DESIGNER PORTFOLIO PROJECTS */}

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
                  designer:
                    designer.name ||
                    'Designer unavailable'
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
