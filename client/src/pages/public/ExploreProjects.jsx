
import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { useSearchParams } from 'react-router-dom';

import ProjectCard from '../../components/ProjectCard';
import { sampleProjects } from '../../data/sampleProjects';
import { findSimilarProjects } from '../../utils/imageSimilarity';

// Original US-01 image similarity threshold.
const MIN_IMAGE_SIMILARITY = 0.70;

function getText(value) {
  return typeof value === 'string' ? value : '';
}

function getBudget(project) {
  if (
    project.estimatedBudget === null ||
    project.estimatedBudget === undefined ||
    project.estimatedBudget === ''
  ) {
    return null;
  }

  const amount = Number(project.estimatedBudget);

  return Number.isFinite(amount) ? amount : null;
}

function getDateValue(project) {
  const time = new Date(project.createdAt || 0).getTime();

  return Number.isFinite(time) ? time : 0;
}

export default function ExploreProjects({
  onSave,
  onCompare,
  comparedIds = []
}) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';

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
  const [imageMatches, setImageMatches] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  const imageInputRef = useRef(null);
  const imageRequestId = useRef(0);

  // --------------------------------------------------
  // LOAD PUBLISHED PROJECTS FROM MONGODB
  // --------------------------------------------------

  useEffect(() => {
    const abortController = new AbortController();

    async function loadDatabaseProjects() {
      setProjectsLoading(true);
      setProjectsError('');

      try {
        const response = await fetch('/api/projects/public', {
          credentials: 'include',
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(
            'Unable to load published projects from MongoDB.'
          );
        }

        const result = await response.json();

        if (
          !result.success ||
          !Array.isArray(result.data)
        ) {
          throw new Error(
            'The project API returned an invalid response.'
          );
        }

        if (!abortController.signal.aborted) {
          // Each MongoDB project is displayed only once.
          const uniqueProjects = [
            ...new Map(
              result.data.map(project => [
                project.id,
                project
              ])
            ).values()
          ];

          setDatabaseProjects(uniqueProjects);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error(
            'Published projects retrieval failed:',
            error
          );

          setProjectsError(error.message);
          setDatabaseProjects([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setProjectsLoading(false);
        }
      }
    }

    loadDatabaseProjects();

    return () => abortController.abort();
  }, []);

  // Keep keyword input in sync with the URL.
  useEffect(() => {
    setTerm(query);
  }, [query]);

  // Invalidate unfinished image searches on unmount.
  useEffect(() => {
    return () => {
      imageRequestId.current += 1;
    };
  }, []);

  // --------------------------------------------------
  // FILTER OPTIONS
  // --------------------------------------------------

  const options = (field) =>
    [...new Set(
      databaseProjects.map(project => project[field])
    )]
      .filter(Boolean)
      .sort();

  const invalidBudgetRange =
    minBudget !== '' &&
    maxBudget !== '' &&
    Number(minBudget) > Number(maxBudget);

  // --------------------------------------------------
  // AUTOCOMPLETE
  // --------------------------------------------------

  const suggestions = useMemo(() => {
    const keyword = term.trim().toLowerCase();

    if (!keyword || !showSuggestions) {
      return [];
    }

    const matchingTitles = databaseProjects
      .filter(project =>
        getText(project.title)
          .toLowerCase()
          .includes(keyword)
      )
      .map(project => project.title);

    return [...new Set(matchingTitles)].slice(0, 6);
  }, [term, showSuggestions, databaseProjects]);

  // --------------------------------------------------
  // MAP IMAGE RESULTS TO MONGODB PROJECTS
  // --------------------------------------------------

  const imageScores = useMemo(() => {
    if (imageMatches === null) {
      return null;
    }

    // CLIP currently returns sampleProjects records.
    // Each of those records has an ID such as sample-001.
    return new Map(
      imageMatches.map(({ project, similarity }) => [
        project.id,
        similarity
      ])
    );
  }, [imageMatches]);

  function getImageScore(project) {
    if (imageScores === null) {
      return null;
    }

    // Migrated projects preserve their original IDs here.
    const sampleId = project.legacySampleId;

    if (!sampleId) {
      return null;
    }

    return imageScores.get(sampleId) ?? null;
  }

  // --------------------------------------------------
  // SEARCH, FILTER AND SORT
  // --------------------------------------------------

  const displayProjects = useMemo(() => {
    if (invalidBudgetRange) {
      return [];
    }

    const keyword = query.trim().toLowerCase();

    const matchingProjects = databaseProjects.filter(
      project => {
        const title = getText(project.title)
          .toLowerCase();

        const description = getText(project.description)
          .toLowerCase();

        const budget = getBudget(project);

        const matchesKeyword =
          !keyword ||
          title.includes(keyword) ||
          description.includes(keyword);

        const matchesBudget =
          (
            minBudget === '' ||
            (budget !== null &&
              budget >= Number(minBudget))
          ) &&
          (
            maxBudget === '' ||
            (budget !== null &&
              budget <= Number(maxBudget))
          );

        const similarity = imageScores === null
          ? null
          : imageScores.get(
              project.legacySampleId
            );

        const matchesImage =
          imageScores === null ||
          (
            similarity !== undefined &&
            similarity >= MIN_IMAGE_SIMILARITY
          );

        return (
          matchesKeyword &&
          matchesBudget &&
          matchesImage &&
          (!style || project.style === style) &&
          (!propertyType ||
            project.propertyType === propertyType) &&
          (!roomType ||
            project.roomType === roomType) &&
          (!projectStatus ||
            project.projectStatus === projectStatus)
        );
      }
    );

    const sorted = [...matchingProjects];

    if (sortOption === 'newest') {
      sorted.sort(
        (a, b) => getDateValue(b) - getDateValue(a)
      );
    } else if (sortOption === 'oldest') {
      sorted.sort(
        (a, b) => getDateValue(a) - getDateValue(b)
      );
    } else if (sortOption === 'budget_low') {
      sorted.sort((a, b) => {
        const aBudget = getBudget(a);
        const bBudget = getBudget(b);

        if (aBudget === null) return 1;
        if (bBudget === null) return -1;

        return aBudget - bBudget;
      });
    } else if (sortOption === 'budget_high') {
      sorted.sort((a, b) => {
        const aBudget = getBudget(a);
        const bBudget = getBudget(b);

        if (aBudget === null) return 1;
        if (bBudget === null) return -1;

        return bBudget - aBudget;
      });
    } else if (sortOption === 'relevance') {
      if (imageScores !== null) {
        sorted.sort(
          (a, b) =>
            (getImageScore(b) ?? 0) -
            (getImageScore(a) ?? 0)
        );
      } else if (keyword) {
        function relevanceScore(project) {
          const title = getText(project.title)
            .toLowerCase();

          const description = getText(
            project.description
          ).toLowerCase();

          if (title === keyword) return 3;
          if (title.includes(keyword)) return 2;
          if (description.includes(keyword)) return 1;

          return 0;
        }

        sorted.sort(
          (a, b) =>
            relevanceScore(b) - relevanceScore(a)
        );
      }
    }

    return sorted;
  }, [
    databaseProjects,
    query,
    style,
    propertyType,
    roomType,
    projectStatus,
    minBudget,
    maxBudget,
    sortOption,
    imageScores,
    invalidBudgetRange
  ]);

  // --------------------------------------------------
  // KEYWORD SEARCH
  // --------------------------------------------------

  function submit(event) {
    event.preventDefault();

    setParams(
      term.trim()
        ? { q: term.trim() }
        : {}
    );

    setShowSuggestions(false);
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
        {/* Keyword input */}
        <div className="search-input-group">
          <input
            aria-label="Project search keywords"
            placeholder="Search projects by keyword"
            value={term}
            autoComplete="off"
            onChange={event => {
              setTerm(event.target.value);
              setShowSuggestions(true);
            }}
          />

          {suggestions.length > 0 && (
            <ul className="search-suggestions">
              {suggestions.map(suggestion => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => {
                      setTerm(suggestion);
                      setParams({ q: suggestion });
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Design style */}
        <select
          aria-label="Design style"
          value={style}
          onChange={event =>
            setStyle(event.target.value)
          }
        >
          <option value="">All styles</option>

          {options('style').map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        {/* Property type */}
        <select
          aria-label="Property type"
          value={propertyType}
          onChange={event =>
            setPropertyType(event.target.value)
          }
        >
          <option value="">All property types</option>

          {options('propertyType').map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        {/* Room type */}
        <select
          aria-label="Room Type"
          value={roomType}
          onChange={event =>
            setRoomType(event.target.value)
          }
        >
          <option value="">All room types</option>

          {options('roomType').map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        {/* Project status */}
        <select
          aria-label="Project Status"
          value={projectStatus}
          onChange={event =>
            setProjectStatus(event.target.value)
          }
        >
          <option value="">All project statuses</option>

          {options('projectStatus').map(value => (
            <option key={value} value={value}>
              {value.charAt(0).toUpperCase() +
                value.slice(1)}
            </option>
          ))}
        </select>

        {/* Minimum budget */}
        <input
          type="number"
          aria-label="Minimum budget"
          placeholder="Min budget (S$)"
          min="0"
          step="1000"
          value={minBudget}
          onChange={event =>
            setMinBudget(event.target.value)
          }
        />

        {/* Maximum budget */}
        <input
          type="number"
          aria-label="Maximum budget"
          placeholder="Max budget (S$)"
          min="0"
          step="1000"
          value={maxBudget}
          onChange={event =>
            setMaxBudget(event.target.value)
          }
        />

        {/* Sort */}
        <select
          aria-label="Sort projects"
          value={sortOption}
          onChange={event =>
            setSortOption(event.target.value)
          }
        >
          <option value="relevance">
            Most relevant
          </option>

          <option value="newest">
            Newest first
          </option>

          <option value="oldest">
            Oldest first
          </option>

          <option value="budget_low">
            Budget: Low to High
          </option>

          <option value="budget_high">
            Budget: High to Low
          </option>
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

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div
          className="active-filters"
          aria-label="Active search criteria"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            marginTop: '16px',
            marginBottom: '20px'
          }}
        >
          <strong style={{ fontSize: '14px' }}>
            Active filters:
          </strong>

          {activeFilters.map(filter => (
            <button
              key={filter.key}
              type="button"
              style={chipStyle}
              onClick={filter.remove}
              aria-label={`Remove ${filter.label}`}
              title={`Remove ${filter.label}`}
            >
              <span>{filter.label}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Invalid budget */}
      {invalidBudgetRange && (
        <p role="alert" className="muted">
          Minimum budget cannot be greater than
          maximum budget.
        </p>
      )}

      {/* Image similarity */}
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
          onChange={handleImageUpload}
          disabled={projectsLoading || Boolean(projectsError)}
        />

        {imageLoading && (
          <p role="status" className="muted">
            Analysing inspiration image and comparing
            project photographs...
          </p>
        )}

        {imageError && (
          <p role="alert">
            {imageError}
          </p>
        )}

        {imageMatches !== null && !imageLoading && (
          <p className="muted">
            Image comparison complete. Matching projects
            are ranked by visual similarity when Most
            relevant is selected.
          </p>
        )}
      </div>

      {/* Database loading */}
      {projectsLoading && (
        <p role="status" className="muted">
          Loading published projects...
        </p>
      )}

      {/* Database error */}
      {projectsError && (
        <p role="alert">
          {projectsError} Please check the backend server.
        </p>
      )}

      {/* Results */}
      {!projectsLoading &&
        !projectsError &&
        !invalidBudgetRange &&
        !imageLoading && (
          <p className="muted">
            {displayProjects.length} matching projects found.
          </p>
        )}

      {!projectsLoading &&
        !projectsError &&
        !imageLoading && (
          <div className="project-grid">
            {displayProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onSave={onSave}
                onCompare={onCompare}
                isCompared={comparedIds.includes(
                  project.id
                )}
              />
            ))}
          </div>
        )}

      {/* No results */}
      {!projectsLoading &&
        !projectsError &&
        !invalidBudgetRange &&
        !imageLoading &&
        !imageError &&
        displayProjects.length === 0 && (
          <div>
            <p>No matching projects found.</p>

            <ul>
              <li>
                Try using fewer or more general keywords.
              </li>
              <li>
                Try removing one or more filters.
              </li>
              <li>
                Try increasing your maximum budget.
              </li>
            </ul>
          </div>
        )}
    </div>
  );
}
