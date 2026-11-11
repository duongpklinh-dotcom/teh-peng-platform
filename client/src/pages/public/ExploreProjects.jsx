
import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

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

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // US-01 + US-02:
  // All displayed project records come from MongoDB.
  const [databaseProjects, setDatabaseProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');

  // Keyword search.
  const [term, setTerm] = useState(query);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Project filters.
  const [style, setStyle] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [roomType, setRoomType] = useState('');
  const [projectStatus, setProjectStatus] = useState('');

  // Budget filters.
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // Sorting.
  const [sortOption, setSortOption] = useState('relevance');

  // Image similarity search.
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

  function removeKeyword() {
    setTerm('');
    setShowSuggestions(false);
    setParams({});
  }

  // --------------------------------------------------
  // IMAGE SIMILARITY SEARCH
  // --------------------------------------------------

  function clearImageSearch() {
    imageRequestId.current += 1;

    setImageName('');
    setImageMatches(null);
    setImageLoading(false);
    setImageError('');

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      clearImageSearch();
      return;
    }

    const requestId = ++imageRequestId.current;

    setImageName(file.name);
    setImageMatches(null);
    setImageLoading(true);
    setImageError('');

    try {
      /*
       * Keep using the original sampleProjects catalogue
       * for visual similarity computation.
       *
       * The rendered results will be the corresponding
       * MongoDB documents, matched by legacySampleId.
       */
      const results = await findSimilarProjects(
        file,
        sampleProjects
      );

      if (requestId !== imageRequestId.current) {
        return;
      }

      console.table(
        results.map(({ project, similarity }) => ({
          project: project.title,
          legacySampleId: project.id,
          similarity: similarity.toFixed(4)
        }))
      );

      setImageMatches(results);
      setSortOption('relevance');
    } catch (error) {
      if (requestId !== imageRequestId.current) {
        return;
      }

      setImageMatches(null);
      setImageError(
        error.message || 'Image similarity search failed.'
      );
    } finally {
      if (requestId === imageRequestId.current) {
        setImageLoading(false);
      }
    }
  }

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  function resetSearch() {
    setTerm('');
    setStyle('');
    setPropertyType('');
    setRoomType('');
    setProjectStatus('');
    setMinBudget('');
    setMaxBudget('');
    setSortOption('relevance');
    setShowSuggestions(false);

    setParams({});
    clearImageSearch();
  }

  // --------------------------------------------------
  // ACTIVE FILTER CHIPS
  // --------------------------------------------------

  const sortLabels = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    budget_low: 'Budget: Low to High',
    budget_high: 'Budget: High to Low'
  };

  const activeFilters = [
    ...(query ? [{
      key: 'keyword',
      label: `Keyword: ${query}`,
      remove: removeKeyword
    }] : []),

    ...(style ? [{
      key: 'style',
      label: `Style: ${style}`,
      remove: () => setStyle('')
    }] : []),

    ...(propertyType ? [{
      key: 'propertyType',
      label: `Property: ${propertyType}`,
      remove: () => setPropertyType('')
    }] : []),

    ...(roomType ? [{
      key: 'roomType',
      label: `Room: ${roomType}`,
      remove: () => setRoomType('')
    }] : []),

    ...(projectStatus ? [{
      key: 'projectStatus',
      label: `Status: ${
        projectStatus.charAt(0).toUpperCase() +
        projectStatus.slice(1)
      }`,
      remove: () => setProjectStatus('')
    }] : []),

    ...(minBudget !== '' ? [{
      key: 'minBudget',
      label: `Min budget: S$${Number(
        minBudget
      ).toLocaleString('en-SG')}`,
      remove: () => setMinBudget('')
    }] : []),

    ...(maxBudget !== '' ? [{
      key: 'maxBudget',
      label: `Max budget: S$${Number(
        maxBudget
      ).toLocaleString('en-SG')}`,
      remove: () => setMaxBudget('')
    }] : []),

    ...(sortOption !== 'relevance' ? [{
      key: 'sortOption',
      label: `Sort: ${sortLabels[sortOption]}`,
      remove: () => setSortOption('relevance')
    }] : []),

    ...(imageName ? [{
      key: 'image',
      label: `Image: ${imageName}`,
      remove: clearImageSearch
    }] : [])
  ];

  const chipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    border: '1px solid #6b4228',
    borderRadius: '999px',
    backgroundColor: '#fff8f2',
    color: '#593019',
    fontSize: '14px',
    cursor: 'pointer'
  };

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

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

        {/* Property type */}
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

        <button
          className="pill"
          type="button"
          onClick={resetSearch}
        >
          Reset
        </button>
      </form>

      <div className="inspiration-upload">
        <label htmlFor="inspiration-image">
          <strong>Upload inspiration image</strong>
          {' '}(find visually similar projects)
        </label>

        <input
          ref={imageInputRef}
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
