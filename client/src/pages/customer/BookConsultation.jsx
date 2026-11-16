
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { projects } from '../../data/demo';
import './BookConsultation.css';

const API_BASE = '/api';

function isMongoId(value) {
  return (
    typeof value === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(value)
  );
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore'
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Singapore'
  });
}

export default function BookConsultation() {
  const [searchParams] = useSearchParams();

  const projectId = searchParams.get('project');

  const project = projects.find(
    item => String(item.id) === projectId
  );

  const projectDesignerId =
    typeof project?.designerId === 'string'
      ? project.designerId
      : project?.designerId?.$oid || null;

  const queryDesignerId = searchParams.get('designerId');

  const designerId = isMongoId(projectDesignerId)
    ? projectDesignerId
    : isMongoId(queryDesignerId)
      ? queryDesignerId
      : null;

  const [preferredTime, setPreferredTime] =
    useState('morning');

  const [selectedSlotId, setSelectedSlotId] =
    useState(null);

  const [
    renovationRequirements,
    setRenovationRequirements
  ] = useState('');

  const [availableSlots, setAvailableSlots] =
    useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      setError('');

      if (!project || !designerId) {
        return;
      }

      setLoading(true);

      try {
        const params = new URLSearchParams({
          designerId,
          preferredTime
        });

        const response = await fetch(
          `${API_BASE}/consultations/slots?${params}`,
          {
            credentials: 'include'
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || 'Unable to load slots.'
          );
        }

        if (!cancelled) {
          setAvailableSlots(result.data || []);
        }

      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [designerId, preferredTime, projectId]);

  const recommendedSlots = [...availableSlots].sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      new Date(a.startTime) - new Date(b.startTime)
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !project ||
      !designerId ||
      !selectedSlotId ||
      !renovationRequirements.trim() ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSuccess(null);

    try {
      // Obtain CSRF token using the existing auth endpoint
      const csrfResponse = await fetch(
        `${API_BASE}/auth/csrf-token`,
        {
          credentials: 'include'
        }
      );

      const csrfResult = await csrfResponse.json();

      if (!csrfResponse.ok || !csrfResult.success) {
        throw new Error(
          'Unable to verify the request security token.'
        );
      }

      const csrfToken = csrfResult.data?.csrfToken;

      if (!csrfToken) {
        throw new Error('CSRF token was not returned.');
      }

      const response = await fetch(
        `${API_BASE}/consultations`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            designerId,
            slotId: selectedSlotId,
            renovationRequirements:
              renovationRequirements.trim()
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Unable to submit consultation.'
        );
      }

      setSuccess(result.data);
      setSelectedSlotId(null);
      setRenovationRequirements('');

      // Remove the newly reserved slot from the page
      setAvailableSlots(previous =>
        previous.filter(
          slot => slot.slotId !== result.data.slotId
        )
      );

    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page section consultation-page">
      <Link to="/projects" className="text-link">
        ← Back to Projects
      </Link>

      <div className="consultation-heading">
        <span className="eyebrow">
          Connect with a designer
        </span>

        <h1>Book a Consultation</h1>

        <p>
          Share your renovation ideas and find a suitable
          time to speak with an interior designer.
        </p>
      </div>

      <div className="consultation-layout">
        <form
          className="consultation-form panel"
          onSubmit={handleSubmit}
        >
          <div className="consultation-section">
            <h2>1. Your selected project</h2>

            {project ? (
              <div className="consultation-project">
                {project.image && (
                  <img
                    src={project.image}
                    alt={project.title}
                  />
                )}

                <div>
                  <h3>{project.title}</h3>
                  <p>Designer: {project.designer}</p>
                </div>
              </div>
            ) : (
              <div className="consultation-notice">
                No project selected. Please choose a project
                from the Explore Projects page.
              </div>
            )}

            {project && !designerId && (
              <div
                className="consultation-notice"
                role="alert"
              >
                This project is not yet linked to a
                registered interior designer. Consultation
                booking is unavailable for this project.
              </div>
            )}
          </div>

          <div className="consultation-section">
            <h2>2. Preferred consultation period</h2>

            <p>
              Choose your preferred time of day. Available
              slots will be ranked according to your preference.
            </p>

            <div className="consultation-periods">
              <button
                type="button"
                className={
                  preferredTime === 'morning'
                    ? 'consultation-period selected'
                    : 'consultation-period'
                }
                aria-pressed={preferredTime === 'morning'}
                onClick={() => {
                  setPreferredTime('morning');
                  setSelectedSlotId(null);
                }}
              >
                <strong>Morning</strong>
                <span>Before 12:00 PM</span>
              </button>

              <button
                type="button"
                className={
                  preferredTime === 'afternoon'
                    ? 'consultation-period selected'
                    : 'consultation-period'
                }
                aria-pressed={preferredTime === 'afternoon'}
                onClick={() => {
                  setPreferredTime('afternoon');
                  setSelectedSlotId(null);
                }}
              >
                <strong>Afternoon</strong>
                <span>12:00 PM onwards</span>
              </button>
            </div>
          </div>

          <div className="consultation-section">
            <h2>3. Select an available time slot</h2>

            {loading ? (
              <p>Loading available time slots...</p>
            ) : error ? (
              <p
                role="alert"
                className="consultation-error"
              >
                {error}
              </p>
            ) : !designerId ? (
              <div className="consultation-notice">
                A registered designer must be linked to
                this project before slots can be displayed.
              </div>
            ) : recommendedSlots.length === 0 ? (
              <div className="consultation-notice">
                No available consultation slots for this
                designer at the moment.
              </div>
            ) : (
              <div className="consultation-slots">
                {recommendedSlots.map(slot => (
                  <button
                    key={slot.slotId}
                    type="button"
                    className={
                      selectedSlotId === slot.slotId
                        ? 'consultation-slot selected'
                        : 'consultation-slot'
                    }
                    aria-pressed={
                      selectedSlotId === slot.slotId
                    }
                    onClick={() =>
                      setSelectedSlotId(slot.slotId)
                    }
                  >
                    <strong>
                      {formatDate(slot.startTime)}
                    </strong>

                    <span>
                      {formatTime(slot.startTime)}
                    </span>

                    {slot.matchScore >= 100 && (
                      <small>Recommended</small>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="consultation-section">
            <h2>4. Renovation requirements</h2>

            <label
              htmlFor="renovationRequirements"
              className="consultation-label"
            >
              Tell us about your renovation plans
            </label>

            <textarea
              id="renovationRequirements"
              value={renovationRequirements}
              onChange={event =>
                setRenovationRequirements(event.target.value)
              }
              placeholder="E.g. I'm renovating a 4-room HDB flat and would like a minimalist design..."
              rows={5}
              maxLength={2000}
              required
            />

            <p className="muted">
              {renovationRequirements.length}/2000 characters
            </p>
          </div>

          {submitError && (
            <p
              role="alert"
              className="consultation-error"
            >
              {submitError}
            </p>
          )}

          {success && (
            <div
              className="consultation-notice"
              role="status"
            >
              <strong>
                Consultation request submitted!
              </strong>
              <p>
                Your request status is{' '}
                {success.requestStatus}.
              </p>
              <p>
                Request ID: {success.requestId}
              </p>
              <Link
                to="/account/consultations"
                className="text-link"
              >
                View My Consultations →
              </Link>
            </div>
          )}

          <button
            type="submit"
            className="pill consultation-submit"
            disabled={
              !project ||
              !designerId ||
              !selectedSlotId ||
              !renovationRequirements.trim() ||
              loading ||
              submitting
            }
          >
            {submitting
              ? 'Submitting...'
              : 'Request Consultation'}
          </button>
        </form>

        <aside className="consultation-sidebar panel">
          <span className="eyebrow">
            Your consultation
          </span>

          <h3>What happens next?</h3>

          <div className="consultation-step">
            <span>01</span>
            <p>Select your preferred consultation period.</p>
          </div>

          <div className="consultation-step">
            <span>02</span>
            <p>Choose an available appointment.</p>
          </div>

          <div className="consultation-step">
            <span>03</span>
            <p>Share your renovation requirements.</p>
          </div>

          <div className="consultation-step">
            <span>04</span>
            <p>
              Submit your request and view its status
              in My Consultations.
            </p>
          </div>

          <Link
            to="/account/consultations"
            className="text-link"
          >
            View My Consultations →
          </Link>
        </aside>
      </div>
    </div>
  );
}
