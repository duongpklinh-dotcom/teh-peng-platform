
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Workspace from '../../components/Workspace';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const initialForm = {
  title: '',
  description: '',
  category: '',
  style: '',
  propertyType: '',
  roomType: '',
  numRooms: '',
  areaSqm: '',
  estimatedBudget: '',
  projectStatus: 'ongoing'
};

export default function AddProject({ user }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const previewUrls = useRef([]);

  useEffect(() => {
    return () => {
      previewUrls.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(current => ({
      ...current,
      [name]: value
    }));
  }

  function handleImages(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    setError('');

    if (images.length + selected.length > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    if (selected.some(file => !ALLOWED_TYPES.includes(file.type))) {
      setError('Only JPG, PNG and WebP images are supported.');
      return;
    }

    if (selected.some(file => file.size > MAX_IMAGE_SIZE)) {
      setError('Each image must be 3 MB or smaller.');
      return;
    }

    const additions = selected.map(file => {
      const url = URL.createObjectURL(file);

      previewUrls.current.push(url);

      return { file, url };
    });

    setImages(current => [...current, ...additions]);
  }

  function removeImage(index) {
    const removed = images[index];

    if (!removed) return;

    URL.revokeObjectURL(removed.url);

    previewUrls.current = previewUrls.current.filter(
      url => url !== removed.url
    );

    setImages(current =>
      current.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError('');

    if (!form.title.trim()) {
      setError('Please enter a project title.');
      return;
    }

    setSaving(true);

    try {
      const tokenResponse = await fetch('/api/auth/csrf-token', {
        credentials: 'include'
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(
          tokenResult.error || 'Unable to start request.'
        );
      }

     
      // Prepare project information and selected images
      const projectData = new FormData();

      projectData.append('title', form.title.trim());
      projectData.append('description', form.description.trim());
      projectData.append('style', form.style);
      projectData.append('propertyType', form.propertyType);
      projectData.append('roomType', form.roomType);
      projectData.append('projectStatus', form.projectStatus);
      projectData.append('category', form.category);

      if (form.numRooms !== '') {
        projectData.append('numRooms', form.numRooms);
      }

      if (form.areaSqm !== '') {
        projectData.append('areaSqm', form.areaSqm);
      }

      if (form.estimatedBudget !== '') {
        projectData.append(
          'estimatedBudget',
          form.estimatedBudget
        );
      }

      // Attach selected image files
      images.forEach(({ file }) => {
        projectData.append('images', file);
      });

      // Submit to the existing Add Project API
      const response = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'x-csrf-token': tokenResult.data.csrfToken
        },
        body: projectData
      });



      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to create project.'
        );
      }

      navigate('/designer/projects', {
        replace: true,
        state: {
          notice: 'Project added successfully.'
        }
      });

    } catch (err) {
      setError(
        err.message || 'Unable to save project. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-project-page">
      <Workspace
        label="Interior designer"
        title="Add New Project"
      >
        {user?.role !== 'interior_designer' ? (
          <div className="panel add-project-form">
            <p>
              Please log in as an interior designer
              to add a project.
            </p>

            <Link className="text-link" to="/login">
              Login
            </Link>
          </div>
        ) : (
          <form
            className="panel form-stack add-project-form"
            onSubmit={handleSubmit}
          >
            <p className="muted">
              Showcase your interior design projects.
              New projects are saved as unpublished.
            </p>

            {/* PROJECT INFORMATION */}
            <section className="add-project-group">
              <h2>Project Information</h2>

              <div className="add-project-grid">

                <label className="add-project-wide">
                  Project title *
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Modern 4-room HDB"
                    maxLength={120}
                    required
                  />
                </label>

                <label>
                  Project category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="">Select category</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </label>

                <label>
                  Design style
                  <select
                    name="style"
                    value={form.style}
                    onChange={handleChange}
                  >
                    <option value="">Select style</option>
                    {[
                      'Modern',
                      'Minimalist',
                      'Contemporary',
                      'Scandinavian',
                      'Industrial',
                      'Japandi',
                      'Other'
                    ].map(style => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="add-project-wide">
                  About this project
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the design concept and key features..."
                    maxLength={1500}
                    rows={5}
                  />
                  <small>
                    {form.description.length}/1500 characters
                  </small>
                </label>

              </div>
            </section>

            {/* PROPERTY DETAILS */}
            <section className="add-project-group">
              <h2>Property Details</h2>

              <div className="add-project-grid">

                <label>
                  Property type
                  <select
                    name="propertyType"
                    value={form.propertyType}
                    onChange={handleChange}
                  >
                    <option value="">Select property type</option>
                    {[
                      'HDB',
                      'Condominium',
                      'Apartment',
                      'Landed',
                      'Office',
                      'Retail',
                      'Other'
                    ].map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Room type
                  <select
                    name="roomType"
                    value={form.roomType}
                    onChange={handleChange}
                  >
                    <option value="">Select room type</option>
                    {[
                      'Whole home',
                      'Living room',
                      'Kitchen',
                      'Bedroom',
                      'Bathroom',
                      'Office space',
                      'Other'
                    ].map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Number of rooms
                  <input
                    type="number"
                    name="numRooms"
                    value={form.numRooms}
                    onChange={handleChange}
                    placeholder="e.g. 4"
                    min="1"
                    step="1"
                  />
                </label>

                <label>
                  Area (sqm)
                  <input
                    type="number"
                    name="areaSqm"
                    value={form.areaSqm}
                    onChange={handleChange}
                    placeholder="e.g. 95"
                    min="0.01"
                    step="any"
                  />
                </label>

                <label>
                  Estimated budget (SGD)
                  <input
                    type="number"
                    name="estimatedBudget"
                    value={form.estimatedBudget}
                    onChange={handleChange}
                    placeholder="e.g. 50000"
                    min="0"
                    step="any"
                  />
                </label>

                <label>
                  Project status
                  <select
                    name="projectStatus"
                    value={form.projectStatus}
                    onChange={handleChange}
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>

              </div>
            </section>

            {/* PROJECT IMAGES */}
            <section className="add-project-group">
              <h2>Project Images</h2>

              <p className="muted">
                Upload up to 5 project images.
                JPG, PNG or WebP, maximum 3 MB each.
                The first image will be the cover.
              </p>

              <label className="add-project-upload">
                <span>+ Add Project Images</span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImages}
                  disabled={saving || images.length >= MAX_IMAGES}
                />
              </label>

              {images.length > 0 && (
                <div className="add-project-previews">
                  {images.map(({ file, url }, index) => (
                    <div
                      className="add-project-preview"
                      key={url}
                    >
                      <img
                        src={url}
                        alt={`Preview of ${file.name}`}
                      />

                      <span>
                        {index === 0
                          ? 'Cover image'
                          : `Image ${index + 1}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* FORM ACTIONS */}
            {error && (
              <p className="add-project-error" role="alert">
                {error}
              </p>
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
                {saving ? 'Saving project...' : 'Save Project'}
              </button>
            </div>

          </form>
        )}
      </Workspace>
    </div>
  );
}
