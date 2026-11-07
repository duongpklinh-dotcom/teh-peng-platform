
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProjectCard from '../../components/ProjectCard';

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
  const [suggestions, setSuggestions] = useState([]);
  const [apiProjects, setApiProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [broaderSuggestions, setBroaderSuggestions] = useState([]);
  const [style, setStyle] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [roomType, setRoomType] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [imageName, setImageName] = useState('');
  const [sortOption, setSortOption] = useState('');

  useEffect(() => setTerm(query), [query]);

  useEffect(() => {
    const keyword = term.trim();

    if (!keyword) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    async function fetchSuggestions() {
      try {
        const response = await fetch(
          `http://localhost:3001/api/projects/search/suggestions?keyword=${encodeURIComponent(keyword)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Unable to retrieve suggestions.');
        }

        const result = await response.json();

        setSuggestions(result.data);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
        }
      }
    }

    fetchSuggestions();

    return () => controller.abort();
  },[term]);

  useEffect (() => {
    const controller = new AbortController();

    async function fetchProjects() {
      const hasSearchCriteria =
        query.trim() !== '' ||
        style !== '' ||
        propertyType !== '' ||
        roomType !== '' ||
        projectStatus !== '';
      if (!hasSearchCriteria) {
        setApiProjects([]);
        setBroaderSuggestions([]);
        setSearchError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setSearchError('');

      try {
        const searchParams = new URLSearchParams({
          keyword: query,
          sortOption: sortOption,
          propertyType: propertyType,
          selectedStyles: style,
          roomType: roomType,
          projectStatus: projectStatus
        });

        const response = await fetch(
          `http://localhost:3001/api/projects/search?${searchParams.toString()}`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok || result.success !== true) {
          throw new Error(result.error || 'Failed to search projects.');
        }

        setApiProjects(result.data);
        setBroaderSuggestions(result.suggestions || []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSearchError(error.message);
          setApiProjects([]);
          setBroaderSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchProjects();

    return () => controller.abort();
  }, [query, sortOption, propertyType, style, roomType, projectStatus]);

  const displayProjects = apiProjects.map((project) => ({
    ...project,
    id: project._id,
    image: Array.isArray(project.images) && project.images.length > 0
      ? typeof project.images[0] === 'string'
        ? project.images [0]
        : project.images[0]?.url || '/assets/project-placeholder.svg'
      : '/assets/project-placeholder.svg',
    category: project.category || '',
    designer: project.designer || 'Designer not specified'
  }));

  function submit(event) {
    event.preventDefault();
    setParams(term.trim() ? { q: term.trim() } : {});
  }

  function resetSearch() {
    setTerm('');
    setStyle('');
    setPropertyType('');
    setRoomType('')
    setProjectStatus('');
    setSortOption('');
    setSuggestions([]);
    setParams({});
    setBroaderSuggestions([]);
  }

  return (
    <div className="page section">
      <span className="eyebrow">Discover</span>
      <h1>Explore Projects</h1>

      <form className="filter-bar" onSubmit={submit}>
        <div className="search-input-group">
          <input
            aria-label="Project search keywords"
            placeholder="Search projects by keyword"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            autoComplete="off"
          />

          {suggestions.length > 0 && (
            <ul className="search-suggestions">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => {
                      setTerm(suggestion);
                      setSuggestions([]);
                      setParams({ q: suggestion });
                    }}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
          <option>HDB</option>
          <option>Apartment</option>
          <option>Condominium</option>
          <option>Office</option>
        </select>

        <select
          aria-label="Room Type"
          value={roomType}
          onChange={(event) => setRoomType(event.target.value)}
        >
          <option value="">All room types</option>
          <option value="Living Room">Living Room</option>
          <option value="Bedroom">Bedroom</option>
          <option value="Kitchen">Kitchen</option>
          <option value="Bathroom">Bathroom</option>
        </select>

        <select
          aria-label="Project Status"
          value={projectStatus}
          onChange={(event) => setProjectStatus(event.target.value)}
        >
          <option value="">All project statuses</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>

        <select
          aria-label="Sort projects"
          value={sortOption}
          onChange={(event) => setSortOption(event.target.value)}
        >
          <option value="">Default sorting</option>
          <option value="relevance">Most relevant</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        <button className="pill" type="submit">
          Search ↗
        </button>

        <button
         type="button"
         onClick={resetSearch}
        >
          Reset
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

      {!loading &&
        !searchError &&
        (
          query.trim() !== '' ||
          style !== '' ||
          propertyType !== '' ||
          roomType !== '' ||
          projectStatus !== ''
        ) && (
          <p className="muted">
            {displayProjects.length} matching projects found.
          </p>
        )}

      {loading && <p>Searching projects...</p>}

      {searchError && (
        <p role="alert">{searchError}</p>
      )}

      <div className="project-grid">
        {displayProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onSave={onSave}
            onCompare={onCompare}
            isCompared={comparedIds.includes(project.id)}
          />
        ))}
      </div>

      {!loading &&
        !searchError &&
        (
          query.trim() !== '' ||
          style !== '' ||
          propertyType !== '' ||
          roomType !== '' ||
          projectStatus !== ''
        ) &&
        displayProjects.length === 0 && (
        <div>
          <p>No matching projects found.</p>

          {broaderSuggestions.length > 0 && (
            <ul>
              {broaderSuggestions.map((suggestion) => (
                <li key={suggestion}>
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        )}
    </div>
  );
}
