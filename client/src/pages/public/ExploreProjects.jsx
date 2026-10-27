
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProjectCard from '../../components/ProjectCard';
import { projects } from '../../data/demo';

// Frontend-only demo search.
// Actual API integration belongs in the search feature.
export default function ExploreProjects({
  onSave,
  onCompare,
  comparedIds = []
}) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';

  const [term, setTerm] = useState(query);
  const [category, setCategory] = useState('');
  const [style, setStyle] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [imageName, setImageName] = useState('');

  useEffect(() => setTerm(query), [query]);

  const results = projects.filter((project) => {
    const searchable = [
      project.title,
      project.description,
      project.style,
      project.category,
      project.propertyType,
      project.designer
    ].join(' ').toLowerCase();

    return (
      searchable.includes(query.toLowerCase()) &&
      (!category || project.category === category) &&
      (!style || project.style === style) &&
      (!propertyType || project.propertyType === propertyType)
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
          onChange={(event) => setTerm(event.target.value)}
        />

        <select
          aria-label="Project category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          <option>Residential</option>
          <option>Commercial</option>
        </select>

        <select
          aria-label="Design style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          <option value="">All styles</option>
          <option>Modern</option>
          <option>Minimalist</option>
          <option>Contemporary</option>
        </select>

        <select
          aria-label="Property type"
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
        >
          <option value="">All property types</option>
          <option>Apartment</option>
          <option>Condominium</option>
          <option>Office</option>
        </select>

        <button className="pill" type="submit">
          Search ↗
        </button>
      </form>

      <div className="inspiration-upload">
        <label htmlFor="inspiration-image">
          <strong>Upload inspiration image</strong>
          {' '}(design reference only)
        </label>

        <input
          id="inspiration-image"
          type="file"
          accept="image/*"
          onChange={(event) =>
            setImageName(event.target.files?.[0]?.name || '')
          }
        />

        {imageName && (
          <p className="muted">
            Selected: {imageName}. Image similarity search is not connected yet.
          </p>
        )}
      </div>

      <p className="muted">
        {results.length} example projects shown.
        Results currently use local sample data, not MongoDB.
      </p>

      <div className="project-grid">
        {results.map((project) => (
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
        <p>No matching projects found. Try removing a filter.</p>
      )}
    </div>
  );
}
