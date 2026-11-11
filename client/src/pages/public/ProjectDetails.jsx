
import React, { useEffect, useState } from 'react';

import {
  Link,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom';

import ProjectCard from '../../components/ProjectCard';

import {
  getLocalProjectById,
  getLocalRelatedProjects,
  getSampleProjectDetails
} from '../../data/sampleProjectDetails';

function getImageSource(image) {
  const source = typeof image === 'string'
    ? image
    : image?.imagePath ||
      image?.url ||
      image?.src ||
      '';

  if (typeof source !== 'string') {
    return '';
  }

  if (
    (source.startsWith('/') &&
      !source.startsWith('//')) ||
    /^https?:\/\//i.test(source)
  ) {
    return source;
  }

  return '';
}

function DetailField({ label, value }) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e6e0d7',
        borderRadius: '10px'
      }}
    >
      <div
        style={{
          fontSize: '13px',
          opacity: 0.7,
          marginBottom: '6px'
        }}
      >
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}

export default function ProjectDetails({ onSave }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState(null);
  const [designer, setDesigner] = useState(null);
  const [company, setCompany] = useState(null);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [images, setImages] = useState([]);

  const [currentImage, setCurrentImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const returnPath =
    typeof location.state?.from === 'string' &&
    location.state.from.startsWith('/') &&
    !location.state.from.startsWith('//')
      ? location.state.from
      : '/projects';

  useEffect(() => {
    const abortController = new AbortController();

    async function loadProject() {
      setLoading(true);
      setError('');
      setProject(null);
      setDesigner(null);
      setCompany(null);
      setRelatedProjects([]);
      setImages([]);
      setCurrentImage(0);
      setImageFailed(false);

      // STEP 1: Look for an existing local project.
      const localProject = getLocalProjectById(id);

      if (localProject) {
        const details = getSampleProjectDetails(
          localProject
        );

        setProject(details);
        setDesigner(details.designerInfo);
        setCompany(details.companyInfo);

        setRelatedProjects(
          getLocalRelatedProjects(localProject)
        );

        setImages(
          details.images
            .map(getImageSource)
            .filter(Boolean)
        );

        setLoading(false);
        return;
      }

      // STEP 2: Validate MongoDB project IDs.
      if (!/^[0-9a-fA-F]{24}$/.test(id || '')) {
        setError(
          'This project is unavailable or could not be retrieved.'
        );
        setLoading(false);
        return;
      }

      // STEP 3: Retrieve MongoDB project information.
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(id)}`,
          {
            credentials: 'include',
            signal: abortController.signal
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
            'This project is unavailable or could not be retrieved.'
          );
        }

        if (abortController.signal.aborted) {
          return;
        }

        const data = result.data;

        setProject(data.project);
        setDesigner(data.designer);
        setCompany(data.company);

        setRelatedProjects(
          data.relatedProjects || []
        );

        const projectImages = (
          data.images?.length
            ? data.images
            : data.project?.images || []
        );

        setImages(
          projectImages
            .map(getImageSource)
            .filter(Boolean)
        );

      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(
            err.message ||
            'Unable to retrieve project details.'
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProject();

    return () => abortController.abort();
  }, [id]);

  function previousImage() {
    if (!images.length) return;

    setCurrentImage(index =>
      (index - 1 + images.length) % images.length
    );

    setImageFailed(false);
  }

  function nextImage() {
    if (!images.length) return;

    setCurrentImage(index =>
      (index + 1) % images.length
    );

    setImageFailed(false);
  }

  function goBack() {
    navigate(returnPath);
  }

  if (loading) {
    return (
      <div className="page section">
        <p role="status">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page section">
        <h1>Project unavailable</h1>

        <p role="alert">
          {error ||
            'This project is unavailable or could not be retrieved.'}
        </p>

        <button
          type="button"
          className="pill"
          onClick={goBack}
        >
          ← Back to Projects
        </button>
      </div>
    );
  }

  const isSample = project.isSample === true;

  const designerPortfolioPath = isSample
    ? designer?.portfolioPath
    : designer?.id
      ? `/designers/${designer.id}`
      : null;

  const budget = Number(project.estimatedBudget);

  const formattedBudget =
    project.estimatedBudget != null &&
    project.estimatedBudget !== '' &&
    Number.isFinite(budget)
      ? `S$${budget.toLocaleString('en-SG')}`
      : null;

  return (
    <div className="page section">

      {/* BACK NAVIGATION */}
      <button
        type="button"
        className="text-link"
        onClick={goBack}
        style={{
          border: 0,
          background: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '28px'
        }}
      >
        ← Back to Projects
      </button>

      {/* PROJECT HEADER */}
      <header style={{ marginBottom: '30px' }}>
        <span className="eyebrow">
          {[
            project.propertyType,
            project.style
          ].filter(Boolean).join(' · ')}
        </span>

        <h1 style={{ marginTop: '12px' }}>
          {project.title}
        </h1>

        {isSample && (
          <p
            style={{
              fontSize: '13px',
              opacity: 0.7,
              marginTop: '8px'
            }}
          >
            Illustrative sample portfolio project
          </p>
        )}
      </header>

      {/* IMAGE GALLERY */}
      <section aria-label="Project image gallery">
        {images.length > 0 ? (
          <>
            {imageFailed ? (
              <div
                role="status"
                style={{
                  padding: '50px 20px',
                  textAlign: 'center',
                  background: '#f0ebe4',
                  borderRadius: '12px'
                }}
              >
                This image could not be loaded.
              </div>
            ) : (
              <img
                className="detail-image"
                src={images[currentImage]}
                alt={`${project.title} - Image ${currentImage + 1}`}
                onError={() => setImageFailed(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: '580px',
                  objectFit: 'cover',
                  borderRadius: '12px'
                }}
              />
            )}

            {images.length > 1 && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    marginTop: '20px',
                    flexWrap: 'wrap'
                  }}
                >
                  <button
                    type="button"
                    className="pill outline"
                    onClick={previousImage}
                  >
                    ← Previous
                  </button>

                  <span>
                    {currentImage + 1} of {images.length}
                  </span>

                  <button
                    type="button"
                    className="pill outline"
                    onClick={nextImage}
                  >
                    Next →
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    marginTop: '20px',
                    paddingBottom: '10px'
                  }}
                >
                  {images.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      aria-label={`View image ${index + 1}`}
                      aria-pressed={currentImage === index}
                      onClick={() => {
                        setCurrentImage(index);
                        setImageFailed(false);
                      }}
                      style={{
                        flexShrink: 0,
                        border: currentImage === index
                          ? '3px solid #6b4228'
                          : '1px solid #ddd',
                        padding: '3px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: 'transparent'
                      }}
                    >
                      <img
                        src={src}
                        alt={`Thumbnail ${index + 1}`}
                        style={{
                          width: '105px',
                          height: '75px',
                          objectFit: 'cover',
                          borderRadius: '5px'
                        }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p>No project images available.</p>
        )}
      </section>

      {/* PROJECT BODY */}
      <div
        className="detail-columns"
        style={{ marginTop: '40px' }}
      >
        <main>
          <section id="project-information">
            <span className="eyebrow">
              Project Overview
            </span>

            <h2>About this project</h2>

            <p style={{ lineHeight: 1.8 }}>
              {project.description ||
                'No project description is available.'}
            </p>
          </section>

          {/* PROJECT SPECIFICATIONS */}
          <section style={{ marginTop: '36px' }}>
            <h2>Project Specifications</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginTop: '20px'
              }}
            >
              <DetailField
                label="Design Style"
                value={project.style}
              />

              <DetailField
                label="Property Type"
                value={project.propertyType}
              />

              <DetailField
                label="Room Type"
                value={project.roomType}
              />

              <DetailField
                label="Project Status"
                value={project.projectStatus}
              />

              {!isSample && (
                <>
                  <DetailField
                    label="Number of Rooms"
                    value={project.numRooms}
                  />

                  <DetailField
                    label="Area"
                    value={
                      project.areaSqm != null
                        ? `${project.areaSqm} m²`
                        : null
                    }
                  />

                  <DetailField
                    label="Estimated Budget"
                    value={formattedBudget}
                  />
                </>
              )}
            </div>
          </section>

          {/* DESIGNER INFORMATION */}
          <section
            id="designer-information"
            style={{ marginTop: '45px' }}
          >
            <span className="eyebrow">
              Meet the Designer
            </span>

            <h2>Interior Designer</h2>

            {designer ? (
              <>
                <h3>{designer.name}</h3>

                {designer.profileDescription && (
                  <p style={{ lineHeight: 1.8 }}>
                    {designer.profileDescription}
                  </p>
                )}

                {designer.specialisation && (
                  <p>
                    <strong>Specialisation:</strong>{' '}
                    {designer.specialisation}
                  </p>
                )}

                {designerPortfolioPath && (
                  <Link
                    className="text-link"
                    to={designerPortfolioPath}
                  >
                    View Full Designer Portfolio ↗
                  </Link>
                )}
              </>
            ) : (
              <p>Designer information unavailable.</p>
            )}
          </section>

          {/* COMPANY INFORMATION */}
          <section
            id="company-information"
            style={{ marginTop: '45px' }}
          >
            <span className="eyebrow">
              Our Studio
            </span>

            <h2>Design Company</h2>

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
              <p>Company information unavailable.</p>
            )}
          </section>
        </main>

        {/* PROJECT NAVIGATION */}
        <aside className="detail-aside">
          <h3>Explore This Project</h3>

          <a
            className="pill"
            href="#project-information"
          >
            Project Overview
          </a>

          <a
            className="pill"
            href="#designer-information"
          >
            Designer Information
          </a>

          <a
            className="pill"
            href="#company-information"
          >
            Company Information
          </a>

          <a
            className="pill"
            href="#related-projects"
          >
            Related Projects
          </a>

          {designerPortfolioPath && (
            <Link
              className="pill"
              to={designerPortfolioPath}
            >
              Designer Portfolio ↗
            </Link>
          )}

          {typeof onSave === 'function' && (
            <button
              type="button"
              className="pill outline"
              onClick={() => onSave(project.id)}
            >
              ♡ Save to Favourites
            </button>
          )}

          <Link
            className="pill"
            to={`/consultation?project=${encodeURIComponent(project.id)}`}
          >
            Book Consultation ↗
          </Link>
        </aside>
      </div>

      {/* RELATED PROJECTS */}
      <section
        id="related-projects"
        style={{ marginTop: '55px' }}
      >
        <span className="eyebrow">
          More Inspiration
        </span>

        <h2>Other Projects by This Designer</h2>

        {relatedProjects.length ? (
          <div className="project-grid">
            {relatedProjects.map(item => (
              <ProjectCard
                key={item.id}
                project={{
                  ...item,
                  designer:
                    item.designer ||
                    designer?.name ||
                    'Designer unavailable'
                }}
              />
            ))}
          </div>
        ) : (
          <p>
            No other portfolio projects are currently available.
          </p>
        )}
      </section>
    </div>
  );
}
