
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { projects } from '../../data/demo';
import './BookConsultation.css';

const API_BASE = '/api';

function isMongoId(value) {
  return typeof value === 'string' &&
    /^[a-fA-F0-9]{24}$/.test(value);
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

function getSingaporeDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const getPart = type =>
    parts.find(part => part.type === type)?.value;

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

function formatHours(value) {
  if (!value) return '';

  return new Date(
    `2026-01-01T${value}:00+08:00`
  ).toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Singapore'
  });
}

function getLocalTimeValue(isoTime) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(isoTime));

  const hour = parts.find(
    part => part.type === 'hour'
  )?.value;

  const minute = parts.find(
    part => part.type === 'minute'
  )?.value;

  return `${hour}:${minute}`;
}

const fieldStyle = {
  width: '100%',
  padding: '12px',
  border: '1px solid #d6d0c7',
  borderRadius: '8px',
  background: '#fff',
  color: '#292420',
  font: 'inherit'
};

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

  // Existing appointment booking
  const [preferredTime, setPreferredTime] =
    useState('morning');

  const [selectedSlotId, setSelectedSlotId] =
    useState(null);

  const [availableSlots, setAvailableSlots] =
    useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Booking method
  const [bookingMethod, setBookingMethod] =
    useState('available');

  // Calendar booking
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [calendar, setCalendar] = useState(null);
  const [calendarLoading, setCalendarLoading] =
    useState(false);
  const [calendarError, setCalendarError] =
    useState('');
  const [calendarRefresh, setCalendarRefresh] =
    useState(0);

  // Shared booking fields
  const [
    renovationRequirements,
    setRenovationRequirements
  ] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(null);

  // Load existing appointment slots
  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setAvailableSlots([]);
      setSelectedSlotId(null);
      setError('');

      if (!project || !designerId) {
        setLoading(false);
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
          { credentials: 'include' }
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
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [designerId, preferredTime, projectId]);

  // Load actual designer availability for a selected date
  useEffect(() => {
    let cancelled = false;

    setCalendar(null);
    setCustomTime('');
    setCalendarError('');

    if (
      bookingMethod !== 'custom' ||
      !project ||
      !designerId ||
      !customDate
    ) {
      setCalendarLoading(false);
      return;
    }

    async function loadCalendar() {
      setCalendarLoading(true);

      try {
        const params = new URLSearchParams({
          designerId,
          date: customDate
        });

        const response = await fetch(
          `${API_BASE}/consultations/calendar?${params}`,
          { credentials: 'include' }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
            'Unable to load designer availability.'
          );
        }

        if (!cancelled) {
          setCalendar(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setCalendarError(err.message);
        }
      } finally {
        if (!cancelled) {
          setCalendarLoading(false);
        }
      }
    }

    loadCalendar();

    return () => {
      cancelled = true;
    };
  }, [
    bookingMethod,
    projectId,
    designerId,
    customDate,
    calendarRefresh
  ]);

  const recommendedSlots = availableSlots
    .filter(slot => {
      const hour = Number(
        getLocalTimeValue(slot.startTime).split(':')[0]
      );

      return preferredTime === 'morning'
        ? hour < 12
        : hour >= 12;
    })
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        new Date(a.startTime) - new Date(b.startTime)
    );

  const calendarSlots = calendar?.slots || [];

  const selectedCalendarSlot = calendarSlots.find(
    slot =>
      slot.available &&
      slot.startTime === customTime
  );

  const customBookingValid =
    Boolean(selectedCalendarSlot) &&
    !calendarLoading &&
    !calendarError &&
    new Date(selectedCalendarSlot.startTime) > new Date();

  const bookingSelectionValid =
    bookingMethod === 'available'
      ? Boolean(selectedSlotId) && !loading
      : customBookingValid;

  function changeBookingMethod(method) {
    setBookingMethod(method);
    setSelectedSlotId(null);
    setCustomTime('');
    setSubmitError('');
    setSuccess(null);
  }

  function changePreferredTime(value) {
    setPreferredTime(value);
    setSelectedSlotId(null);
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !project ||
      !designerId ||
      !bookingSelectionValid ||
      !renovationRequirements.trim() ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSuccess(null);

    try {
      const csrfResponse = await fetch(
        `${API_BASE}/auth/csrf-token`,
        { credentials: 'include' }
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

      const isCustom = bookingMethod === 'custom';

      const endpoint = isCustom
        ? `${API_BASE}/consultations/custom`
        : `${API_BASE}/consultations`;

      const requestBody = isCustom
        ? {
            designerId,
            startTime: selectedCalendarSlot.startTime,
            renovationRequirements:
              renovationRequirements.trim()
          }
        : {
            designerId,
            slotId: selectedSlotId,
            renovationRequirements:
              renovationRequirements.trim()
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          'Unable to submit consultation.'
        );
      }

      setSuccess(result.data);
      setSelectedSlotId(null);
      setCustomTime('');
      setRenovationRequirements('');

      if (isCustom) {
        // Keep the selected date, but reload its
        // slots so the new booking appears unavailable.
        setCalendarRefresh(previous => previous + 1);
      } else {
        setAvailableSlots(previous =>
          previous.filter(
            slot => slot.slotId !== result.data.slotId
          )
        );
      }
    } catch (err) {
      setSubmitError(err.message);

      // The slot may have been booked by someone else.
      // Reload the calendar after a failed custom request.
      if (bookingMethod === 'custom') {
        setCalendarRefresh(previous => previous + 1);
      }
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
          {/* SECTION 1 */}
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
                No project selected. Please choose a
                project from the Explore Projects page.
              </div>
            )}

            {project && !designerId && (
              <div
                className="consultation-notice"
                role="alert"
              >
                This project is not yet linked to a
                registered interior designer.
                Consultation booking is unavailable.
              </div>
            )}
          </div>

          {/* SECTION 2 */}
          <div className="consultation-section">
            <h2>2. Choose your booking method</h2>

            <p>
              Choose an existing appointment or select
              a date from the designer's live schedule.
            </p>

            <div className="consultation-periods">
              <button
                type="button"
                className={
                  bookingMethod === 'available'
                    ? 'consultation-period selected'
                    : 'consultation-period'
                }
                aria-pressed={
                  bookingMethod === 'available'
                }
                onClick={() =>
                  changeBookingMethod('available')
                }
              >
                <strong>Available Slots</strong>
                <span>
                  Choose from existing appointments
                </span>
              </button>

              <button
                type="button"
                className={
                  bookingMethod === 'custom'
                    ? 'consultation-period selected'
                    : 'consultation-period'
                }
                aria-pressed={
                  bookingMethod === 'custom'
                }
                onClick={() =>
                  changeBookingMethod('custom')
                }
              >
                <strong>Calendar Booking</strong>
                <span>
                  View the designer's actual availability
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 3: EXISTING SLOTS */}
          {bookingMethod === 'available' ? (
            <>
              <div className="consultation-section">
                <h2>3. Preferred consultation period</h2>

                <p>
                  Choose your preferred time of day.
                  Only available appointments within
                  that period will be displayed.
                </p>

                <div className="consultation-periods">
                  <button
                    type="button"
                    className={
                      preferredTime === 'morning'
                        ? 'consultation-period selected'
                        : 'consultation-period'
                    }
                    aria-pressed={
                      preferredTime === 'morning'
                    }
                    onClick={() =>
                      changePreferredTime('morning')
                    }
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
                    aria-pressed={
                      preferredTime === 'afternoon'
                    }
                    onClick={() =>
                      changePreferredTime('afternoon')
                    }
                  >
                    <strong>Afternoon</strong>
                    <span>12:00 PM onwards</span>
                  </button>
                </div>
              </div>

              <div className="consultation-section">
                <h2>4. Select an available time slot</h2>

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
                    A registered designer must be linked
                    to this project before appointments
                    can be displayed.
                  </div>
                ) : recommendedSlots.length === 0 ? (
                  <div className="consultation-notice">
                    No available consultation slots
                    for the selected period.
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
                        onClick={() => {
                          setSelectedSlotId(slot.slotId);
                          setSubmitError('');
                        }}
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
            </>
          ) : (
            /* SECTION 3: CALENDAR */
            <div className="consultation-section">
              <h2>3. Choose your appointment date</h2>

              <p>
                Select a date to view the designer's
                available consultation times.
                Each appointment lasts one hour.
                All times are in Singapore Time (SGT).
              </p>

              <label
                htmlFor="customDate"
                className="consultation-label"
              >
                Preferred appointment date
              </label>

              <input
                id="customDate"
                type="date"
                value={customDate}
                min={getSingaporeDate()}
                onChange={event => {
                  setCustomDate(event.target.value);
                  setCustomTime('');
                  setSubmitError('');
                  setSuccess(null);
                }}
                style={{
                  ...fieldStyle,
                  maxWidth: '350px',
                  display: 'block',
                  marginTop: '10px'
                }}
              />

              {!designerId && (
                <div
                  className="consultation-notice"
                  style={{ marginTop: '20px' }}
                >
                  A registered designer must be linked
                  to this project before you can book.
                </div>
              )}

              {customDate && designerId && (
                <div style={{ marginTop: '26px' }}>
                  <h3>
                    Available times for{' '}
                    {formatDate(
                      `${customDate}T12:00:00+08:00`
                    )}
                  </h3>

                  {calendarLoading ? (
                    <p>Checking designer availability...</p>
                  ) : calendarError ? (
                    <p
                      role="alert"
                      className="consultation-error"
                    >
                      {calendarError}
                    </p>
                  ) : !calendar ? (
                    <p>Loading appointment times...</p>
                  ) : !calendar.isWorking ? (
                    <div className="consultation-notice">
                      The designer is unavailable on
                      this date. Please choose another day.
                    </div>
                  ) : (
                    <>
                      <p className="muted">
                        Designer working hours:{' '}
                        <strong>
                          {formatHours(calendar.startTime)}
                          {' – '}
                          {formatHours(calendar.endTime)}
                        </strong>
                      </p>

                      {calendarSlots.length === 0 ? (
                        <div className="consultation-notice">
                          No one-hour appointments fit
                          within the designer's working
                          hours on this date.
                        </div>
                      ) : (
                        <>
                          <p className="muted">
                            Select an available time.
                            Greyed-out appointments cannot
                            be selected.
                          </p>

                          <div className="consultation-slots">
                            {calendarSlots.map(slot => {
                              const selected =
                                customTime === slot.startTime;

                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  disabled={!slot.available}
                                  className={
                                    selected
                                      ? 'consultation-slot selected'
                                      : 'consultation-slot'
                                  }
                                  aria-pressed={selected}
                                  onClick={() => {
                                    setCustomTime(slot.startTime);
                                    setSubmitError('');
                                  }}
                                  style={{
                                    opacity: slot.available
                                      ? 1
                                      : 0.45,
                                    cursor: slot.available
                                      ? 'pointer'
                                      : 'not-allowed',
                                    border: selected
                                      ? '2px solid #512a10'
                                      : undefined,
                                    background: selected
                                      ? '#f4f1eb'
                                      : undefined
                                  }}
                                >
                                  <strong>
                                    {formatTime(slot.startTime)}
                                  </strong>

                                  <span>
                                    to{' '}
                                    {formatTime(slot.endTime)}
                                  </span>

                                  <small>
                                    {slot.available
                                      ? selected
                                        ? 'Selected'
                                        : 'Available'
                                      : slot.status === 'past'
                                        ? 'Past'
                                        : 'Booked / Unavailable'}
                                  </small>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {selectedCalendarSlot && (
                        <div
                          className="consultation-notice"
                          style={{ marginTop: '22px' }}
                        >
                          <strong>
                            Selected appointment
                          </strong>

                          <p>
                            {formatDate(
                              selectedCalendarSlot.startTime
                            )}
                            {' at '}
                            {formatTime(
                              selectedCalendarSlot.startTime
                            )}
                            {' – '}
                            {formatTime(
                              selectedCalendarSlot.endTime
                            )}
                          </p>

                          <p>
                            Duration: 1 hour
                          </p>

                          <p>
                            The system will check
                            availability again when
                            you submit your request.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RENOVATION REQUIREMENTS */}
          <div className="consultation-section">
            <h2>
              {bookingMethod === 'available' ? '5' : '4'}.
              {' '}Renovation requirements
            </h2>

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
                setRenovationRequirements(
                  event.target.value
                )
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

          {/* ERRORS */}
          {submitError && (
            <p
              role="alert"
              className="consultation-error"
            >
              {submitError}
            </p>
          )}

          {/* CONFIRMATION */}
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

              {success.startTime && (
                <p>
                  Appointment:{' '}
                  {formatDate(success.startTime)}
                  {' at '}
                  {formatTime(success.startTime)}
                </p>
              )}

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

          {/* SUBMIT */}
          <button
            type="submit"
            className="pill consultation-submit"
            disabled={
              !project ||
              !designerId ||
              !bookingSelectionValid ||
              !renovationRequirements.trim() ||
              submitting
            }
          >
            {submitting
              ? 'Submitting...'
              : 'Request Consultation'}
          </button>
        </form>

        {/* SIDEBAR */}
        <aside className="consultation-sidebar panel">
          <span className="eyebrow">
            Your consultation
          </span>

          <h3>What happens next?</h3>

          <div className="consultation-step">
            <span>01</span>
            <p>
              Choose your preferred booking method.
            </p>
          </div>

          <div className="consultation-step">
            <span>02</span>
            <p>
              Select an appointment from the designer's
              available times.
            </p>
          </div>

          <div className="consultation-step">
            <span>03</span>
            <p>
              Share your renovation requirements.
            </p>
          </div>

          <div className="consultation-step">
            <span>04</span>
            <p>
              Submit your request. The system will
              check for scheduling conflicts before
              saving your appointment.
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
