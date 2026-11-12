import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Workspace from '../../components/Workspace';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const initialForm = {
  title: '',
  description: '',
  categoryId: '',
  style: '',
  propertyType: '',
  roomType: '',
  numRooms: '',
  areaSqm: '',
  estimatedBudget: '',
  projectStatus: 'ongoing'
};

const styleOptions = [
  'Modern', 'Minimalist', 'Contemporary',
  'Scandinavian', 'Industrial', 'Japandi', 'Other'
];

const propertyOptions = [
  'HDB', 'Condominium', 'Apartment',
  'Landed', 'Office', 'Retail', 'Other'
];

const roomOptions = [
  'Whole home', 'Living room', 'Kitchen',
  'Bedroom', 'Bathroom', 'Office space', 'Other'
];

function SelectField({ label, name, value, options, onChange }) {
  const values = value && !options.includes(value)
    ? [value, ...options]
    : options;

  return (
    <label>
      {label}
      <select name={name} value={value} onChange={onChange}>
        <option value="">Select {label.toLowerCase()}</option>
        {values.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function imageUrl(image) {
  return typeof image === 'string'
    ? image
    : image?.url || '';
}

export default function EditProject({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [originalForm, setOriginalForm] = useState(initialForm);

  const [existingImages, setExistingImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  const [categories, setCategories] = useState([]);
  const [savedCategoryName, setSavedCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
  if (!error && !notice) return;

  const timer = setTimeout(() => {
    setError('');
    setNotice('');
  }, 4000);

  return () => clearTimeout(timer);
    }, [error, notice]);

  // Retrieve the project's saved information
  useEffect(() => {
    if (user?.role !== 'interior_designer') {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProject() {
      try {
        const response = await fetch(
          `/api/projects/mine/${id}`,
          { credentials: 'include' }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || 'Unable to load project.'
          );
        }

        const project = result.data;
        if (active) {
          setSavedCategoryName(project.category || project.categoryName || '');
        }
        console.log('Saved project category:', {
          categoryId: project.categoryId,
          category: project.category,
          categoryName: project.categoryName
        });

        const values = {
          title: project.title || '',
          description: project.description || '',
          categoryId: project.categoryId || '',
          style: project.style || '',
          propertyType: project.propertyType || '',
          roomType: project.roomType || '',
          numRooms: project.numRooms ?? '',
          areaSqm: project.areaSqm ?? '',
          estimatedBudget: project.estimatedBudget ?? '',
          projectStatus: project.projectStatus || 'ongoing',
        };

        const savedImages = (project.images || [])
          .map(imageUrl)
          .filter(Boolean);

        if (active) {
          setForm(values);
          setOriginalForm(values);
          setExistingImages(savedImages);
          setOriginalImages(savedImages);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load project.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProject();

    return () => { active = false; };
  }, [id, user?.role]);

  // Load available category choices
  // Match the project's saved category name to a category ID
useEffect(() => {
  if (!savedCategoryName || categories.length === 0) return;

  const matchingCategory = categories.find(
    category =>
      category.name?.trim().toLowerCase() ===
      savedCategoryName.trim().toLowerCase()
  );

  if (!matchingCategory) return;

  setForm(current =>
    current.categoryId
      ? current
      : { ...current, categoryId: matchingCategory.id }
  );

  setOriginalForm(current =>
    current.categoryId
      ? current
      : { ...current, categoryId: matchingCategory.id }
  );
}, [savedCategoryName, categories]);
  useEffect(() => {
    if (user?.role !== 'interior_designer') return;

    let active = true;

    async function loadCategories() {
      try {
        const response = await fetch('/api/categories', {
        credentials: 'include'
      });

        if (!response.ok) return;

        const result = await response.json();

        if (active) {
          setCategories(result.data || []);
        }
      } catch {
        // Category selection remains unavailable until
        // the shared category data is connected.
      }
    }

    loadCategories();

    return () => { active = false; };
  }, [user?.role]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm(current => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));

    setNotice('');
    setError('');
  }

  function handleImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (
      existingImages.length +
      newImages.length +
      files.length > MAX_IMAGES
    ) {
      setError(`Maximum ${MAX_IMAGES} images per project.`);
      return;
    }

    if (files.some(file => !ALLOWED_TYPES.includes(file.type))) {
      setError('Only JPG, PNG and WebP images are supported.');
      return;
    }

    if (files.some(file => file.size > MAX_IMAGE_SIZE)) {
      setError('Each image must be 3 MB or smaller.');
      return;
    }

    setNewImages(current => [
      ...current,
      ...files.map(file => ({
        file,
        url: URL.createObjectURL(file)
      }))
    ]);

    setError('');
  }

  function removeNewImage(index) {
    setNewImages(current => {
      const selected = current[index];

      if (selected) URL.revokeObjectURL(selected.url);

      return current.filter((_, i) => i !== index);
    });
  }

  // Release temporary image previews on page exit
  useEffect(() => {
    return () => {
      newImages.forEach(image => URL.revokeObjectURL(image.url));
    };
  }, [newImages]);

  const hasChanges =
    JSON.stringify(form) !== JSON.stringify(originalForm) ||
    JSON.stringify(existingImages) !== JSON.stringify(originalImages) ||
    newImages.length > 0;

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    if (!hasChanges) {
        setError('');
        setNotice('Update at least one field before saving.');
        return;
    }

    if (!form.title.trim()) {
      setError('Project title is required.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const tokenResponse = await fetch('/api/auth/csrf-token', {
        credentials: 'include'
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(
          tokenResult.error || 'Unable to verify request.'
        );
      }

      const projectData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key === 'categoryId' && !value) {
          if (originalForm.categoryId) {
            projectData.append('categoryId', '');
          }
          return;
        }

        projectData.append(key, String(value));
      });

      projectData.append(
        'existingImages',
        JSON.stringify(existingImages)
      );

      newImages.forEach(({ file }) => {
        projectData.append('images', file);
      });

      const response = await fetch(
        `/api/projects/mine/${id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'x-csrf-token': tokenResult.data.csrfToken
          },
          body: projectData
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to update project.'
        );
      }

      navigate('/designer/projects', {
        replace: true,
        state: {
          notice: 'Project updated successfully!'
        }
      });

    } catch (err) {
      setError(err.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== 'interior_designer') {
    return (
      <Workspace
        label="Interior designer"
        title="Edit Project Details"
      >
        <p>Please log in as an interior designer.</p>
      </Workspace>
    );
  }

  return (
    <div className="add-project-page edit-project-page">
      <Workspace
        label="Interior designer"
        title="Edit Project Details"
      >
        {loading ? (
          <p className="muted">Loading project details...</p>
        ) : error && !form.title ? (
          <div className="panel add-project-form">
            <p role="alert">{error}</p>
            <Link className="text-link" to="/designer/projects">
              Back to My Projects
            </Link>
          </div>
        ) : (
          <form
            className="panel form-stack add-project-form"
            onSubmit={handleSubmit}
          >
            <p className="muted">
              Update your project information.
              Changes will be saved to your portfolio.
            </p>

            <section className="add-project-group">
              <h2>Project Information</h2>

              <div className="add-project-grid">
                <label className="add-project-wide">
                  Project title *
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={120}
                    required
                  />
                </label>

                <label>
                  Project category
                  <select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    disabled={categories.length === 0}
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <small>Category options are not available yet.</small>
                  )}
                </label>

                <SelectField
                  label="Design style"
                  name="style"
                  value={form.style}
                  options={styleOptions}
                  onChange={handleChange}
                />

                <label className="add-project-wide">
                  About this project
                  <textarea
                    name="description"
                    rows={5}
                    maxLength={1500}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the project concept..."
                  />
                  <small>
                    {form.description.length}/1500 characters
                  </small>
                </label>
              </div>
            </section>

            <section className="add-project-group">
              <h2>Property Details</h2>

              <div className="add-project-grid">
                <SelectField
                  label="Property type"
                  name="propertyType"
                  value={form.propertyType}
                  options={propertyOptions}
                  onChange={handleChange}
                />

                <SelectField
                  label="Room type"
                  name="roomType"
                  value={form.roomType}
                  options={roomOptions}
                  onChange={handleChange}
                />

                <label>
                  Number of rooms
                  <input
                    type="number"
                    name="numRooms"
                    min="1"
                    step="1"
                    value={form.numRooms}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Area (sqm)
                  <input
                    type="number"
                    name="areaSqm"
                    min="0.01"
                    step="any"
                    value={form.areaSqm}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Estimated budget (SGD)
                  <input
                    type="number"
                    name="estimatedBudget"
                    min="0"
                    step="any"
                    value={form.estimatedBudget}
                    onChange={handleChange}
                  />
                </label>

                <SelectField
                  label="Project status"
                  name="projectStatus"
                  value={form.projectStatus}
                  options={['ongoing', 'completed']}
                  onChange={handleChange}
                />
              </div>
            </section>

            <section className="add-project-group">
              <h2>Project Images</h2>

              <p className="muted">
                Manage up to five images. JPG, PNG or WebP,
                maximum 3 MB each.
                The first image is the cover image.
              </p>

              <div className="add-project-previews">
                {existingImages.map((url, index) => (
                  <div className="add-project-preview" key={url}>
                    <img
                      src={url}
                      alt={`Existing project image ${index + 1}`}
                    />
                    <span>
                      {index === 0 ? 'Cover image' : `Image ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExistingImages(current =>
                        current.filter((_, i) => i !== index)
                      )}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {newImages.map(({ file, url }, index) => (
                  <div className="add-project-preview" key={url}>
                    <img src={url} alt={file.name} />
                    <span>New image {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <label className="add-project-upload">
                <span>+ Add Project Images</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImages}
                  disabled={
                    saving ||
                    existingImages.length + newImages.length >= MAX_IMAGES
                  }
                />
              </label>
            </section>


                {(notice || error) && (
                <div
                    role={error ? 'alert' : 'status'}
                    aria-live={error ? 'assertive' : 'polite'}
                    style={{
                    position: 'fixed',
                    top: '100px',
                    right: '24px',
                    zIndex: 9999,
                    width: 'min(380px, calc(100vw - 32px))',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    background: '#ffffff',
                    border: `1px solid ${error ? '#d9a39b' : '#ded3c5'}`,
                    borderLeft: `4px solid ${error ? '#b76b60' : '#542b0f'}`,
                    borderRadius: '12px',
                    boxShadow: '0 10px 35px rgba(0,0,0,0.13)',
                    color: '#292420'
                    }}
                >
                    <span
                    aria-hidden="true"
                    style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: error ? '#b76b60' : '#542b0f'
                    }}
                    >
                    {error ? '!' : 'i'}
                    </span>

                    <div style={{ flex: 1 }}>
                    <strong
                        style={{
                        display: 'block',
                        fontSize: '14px',
                        marginBottom: '4px'
                        }}
                    >
                        {error ? 'Unable to save' : 'No changes detected'}
                    </strong>

                    <p
                        style={{
                        margin: 0,
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: '#70665e'
                        }}
                    >
                        {error || notice}
                    </p>
                    </div>

                    <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => {
                        setError('');
                        setNotice('');
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#857a6f',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1
                    }}
                    >
                    ×
                    </button>
                </div>
                )}


            <div className="add-project-actions">
              <Link
                className="text-link"
                to="/designer/projects"
              >
                Cancel
              </Link>

              <button
                className="pill"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Workspace>
    </div>
  );
}
