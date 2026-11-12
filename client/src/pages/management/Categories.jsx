// US-PM01 Create IDP category - BCE boundary class: CreateCategoryPage
// Talks to CategoryController through POST/GET /api/categories.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Workspace from '../../components/Workspace';
import { apiRequest, getCsrfToken } from './managementApi';
import '../../styles/admin.css';
import '../../styles/management.css';

const NAME_MAX = 50;
const DESCRIPTION_MAX = 300;
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} &'-]*$/u;

function validate(form) {
  const name = form.name.trim();

  if (!name) return 'Please enter a category name.';
  if (name.length > NAME_MAX) return `Category name must be ${NAME_MAX} characters or fewer.`;
  if (!NAME_PATTERN.test(name)) {
    return 'Name may only contain letters, numbers, spaces, &, apostrophes and hyphens.';
  }
  if (form.description.length > DESCRIPTION_MAX) {
    return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  }

  return '';
}

export default function Categories({ user }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isManager = user?.role === 'platform_management';

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isManager) return undefined;

    let active = true;

    apiRequest('/api/categories')
      .then(data => { if (active) setCategories(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [isManager, reloadKey]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const csrfToken = await getCsrfToken();

      const created = await apiRequest('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim()
        })
      });

      setSuccess(`Category "${created.name}" created. Designers can now use it.`);
      setForm({ name: '', description: '' });
      setReloadKey(key => key + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-project-page">
      <Workspace label="Platform management" title="Manage IDP Categories">
        {!isManager ? (
          <div className="panel add-project-form">
            <p>Please log in as a platform manager to manage categories.</p>
            <Link className="text-link" to="/login">Login</Link>
          </div>
        ) : (
          <>
            <form className="panel form-stack add-project-form" onSubmit={handleSubmit} noValidate>
              <p className="muted">
                Create a category (for example Modern, Scandinavian or Minimalist) so
                designers can classify their projects. Names must be unique.
              </p>

              <label>
                Category name *
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={NAME_MAX}
                  placeholder="e.g. Scandinavian"
                  required
                />
                <small className="pm-counter">{form.name.length}/{NAME_MAX}</small>
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="Short description shown to designers"
                />
                <small className="pm-counter">{form.description.length}/{DESCRIPTION_MAX}</small>
              </label>

              {error && <div className="admin-error" role="alert">{error}</div>}
              {success && <div className="admin-success" role="status">{success}</div>}

              <div className="add-project-actions">
                <button className="pill" type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create category'}
                </button>
              </div>
            </form>

            <div className="panel admin-panel">
              <div className="admin-heading">
                <h2>Existing categories</h2>
                <span className="admin-count">{categories.length} total</span>
              </div>

              {loading ? (
                <p className="admin-empty">Loading categories...</p>
              ) : categories.length === 0 ? (
                <p className="admin-empty">No categories yet. Create the first one above.</p>
              ) : (
                <div className="pm-table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Description</th><th>Status</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {categories.map(category => (
                        <tr key={category.id}>
                          <td><strong>{category.name}</strong></td>
                          <td>{category.description || '-'}</td>
                          <td>
                            <span className={`admin-status is-${category.status}`}>
                              {category.status}
                            </span>
                          </td>
                          <td>{new Date(category.createdAt).toLocaleDateString('en-SG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </Workspace>
    </div>
  );
}
