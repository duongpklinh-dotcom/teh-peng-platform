
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProjectCard from '../../components/ProjectCard';

export default function ExploreProjects({
  onSave,
  onCompare,
  comparedIds = []
}) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [term, setTerm] = useState(query);
  const [category, setCategory] = useState('');
  const [style, setStyle] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [imageName, setImageName] = useState('');

  useEffect(() => {
    setTerm(query);
  }, [query]);

  // Retrieve published projects from MongoDB
  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/projects', {
          signal: controller.signal
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || 'Unable to load projects.'
          );
        }

        // Match MongoDB records to ProjectCard's fields
        const formattedProjects = (result.data || []).map(
          project => ({
            ...project,

            id: String(project.id || project._id),

            image:
              project.images?.[0]?.url ||
              project.images?.[0] ||
              '',

            category:
              typeof project.category === 'string'
                ? project.category
                : project.category?.name || 'Uncategorised',

            designer:
              project.designerName ||
              project.designer?.name ||
              (typeof project.designer === 'string'
                ? project.designer
                : 'Interior Designer')
          })
        );

        setProjects(formattedProjects);

      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load projects.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => controller.abort();
  }, []);

  // Build filter options using actual project data
  const categories = [
    ...new Set(
      projects
        .map(project => project.category)
        .filter(value => value && value !== 'Uncategorised')
    )
  ];

  const styles = [
    ...new Set(
      projects.map(project => project.style).filter(Boolean)
    )
  ];

  const propertyTypes = [
    ...new Set(
      projects
        .map(project => project.propertyType)
        .filter(Boolean)
    )
  ];

  // Filter retrieved projects
  const results = projects.filter(project => {
    const searchable = [
      project.title,
      project.description,
      project.style,
      project.category,
      project.propertyType,
      project.designer
    ].filter(Boolean).join(' ').toLowerCase();

    return (
      searchable.includes(query.toLowerCase()) &&
      (!category || project.category === category) &&
      (!style || project.style === style) &&
      (!propertyType ||
        project.propertyType === propertyType)
    );
  });

  function submit(event) {
    event.preventDefault();

    setParams(term.trim() ? { q: term.trim() } : {});
  }

  return (
    <div className="page section">
      <span className="eyebrow">Discover</span>
      <h1>Explore Projects</h1>

      <form className="filter-bar" onSubmit={submit}>
        <input
          aria-label="Project search keywords"
          placeholder="Search projects by keyword"
          value={term}
          onChange={event => setTerm(event.target.value)}
        />

        <select
          aria-label="Project category"
          value={category}
          onChange={event => setCategory(event.target.value)}
        >
          <option value="">All categories</option>

          {categories.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          aria-label="Design style"
          value={style}
          onChange={event => setStyle(event.target.value)}
        >
          <option value="">All styles</option>

          {styles.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          aria-label="Property type"
          value={propertyType}
          onChange={event => setPropertyType(event.target.value)}
        >
          <option value="">All property types</option>

          {propertyTypes.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <button className="pill" type="submit">
          Search ↗
        </button>
      </form>

      {/* Existing inspiration image interface */}
      <div className="inspiration-upload">
        <label htmlFor="inspiration-image">
          <strong>Upload inspiration image</strong>
          {' '}(design reference only)
        </label>

        <input
          id="inspiration-image"
          type="file"
          accept="image/*"
          onChange={event =>
            setImageName(event.target.files?.[0]?.name || '')
          }
        />

        {imageName && (
          <p className="muted">
            Selected: {imageName}.
            Image similarity search is not connected yet.
          </p>
        )}
      </div>

      {/* Database results */}
      {loading ? (
        <p className="muted">Loading projects...</p>
      ) : error ? (
        <p role="alert" style={{ color: 'crimson' }}>
          {error}
        </p>
      ) : (
        <>
          <p className="muted">
            {results.length} {results.length === 1
              ? 'project'
              : 'projects'} found.
          </p>

          <div className="project-grid">
            {results.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onSave={onSave}
                onCompare={onCompare}
                isCompared={comparedIds.includes(project.id)}
              />
            ))}
          </div>

          {results.length === 0 && (
            <p>
              No matching projects found.
              Try removing a filter.
            </p>
          )}
        </>
      )}
    </div>
  );
}
