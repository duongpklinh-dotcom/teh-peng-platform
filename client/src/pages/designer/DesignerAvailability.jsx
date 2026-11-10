
import React, { useEffect, useState } from 'react';

const DAYS = [
  { dayOfWeek: 1, dayName: 'Monday' },
  { dayOfWeek: 2, dayName: 'Tuesday' },
  { dayOfWeek: 3, dayName: 'Wednesday' },
  { dayOfWeek: 4, dayName: 'Thursday' },
  { dayOfWeek: 5, dayName: 'Friday' },
  { dayOfWeek: 6, dayName: 'Saturday' },
  { dayOfWeek: 0, dayName: 'Sunday' }
];

const API_URL = '/api/designer-availability/mine';
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

function singaporeToday() {
  return new Date(Date.now() + SGT_OFFSET_MS).toISOString().slice(0, 10);
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateWeekday(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

async function csrfToken() {
  const response = await fetch('/api/auth/csrf-token', { credentials: 'include' });
  const result = await response.json();
  if (!response.ok || !result.success || !result.data?.csrfToken) {
    throw new Error(result.error || 'Unable to obtain security token.');
  }
  return result.data.csrfToken;
}


function createDefaultSchedule() {
  return DAYS.map(day => ({
    dayOfWeek: day.dayOfWeek,
    dayName: day.dayName,
    isWorking: day.dayOfWeek >= 1 && day.dayOfWeek <= 5,
    startTime: '09:00',
    endTime: '18:00'
  }));
}

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(value) {
  if (!value) return 'Not set';

  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';

  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default function DesignerAvailability() {
  const [schedule, setSchedule] = useState(createDefaultSchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [hasSavedSchedule, setHasSavedSchedule] = useState(false);
  const [dateOverrides, setDateOverrides] = useState([]);
  const [selectedDate, setSelectedDate] = useState(singaporeToday);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year, month] = singaporeToday().split('-').map(Number);
    return { year, month: month - 1 };
  });
  const [overrideMode, setOverrideMode] = useState('normal');
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('18:00');
  const [dateSaving, setDateSaving] = useState(false);
  const [dateMessage, setDateMessage] = useState('');
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      try {
        const response = await fetch(API_URL, {
          credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || 'Unable to load availability.'
          );
        }

        if (!active) return;

        const savedSchedule = result.data?.weeklySchedule || [];

        if (savedSchedule.length > 0) {
          const mergedSchedule = createDefaultSchedule().map(day => {
            const saved = savedSchedule.find(
              entry => entry.dayOfWeek === day.dayOfWeek
            );

            if (!saved) return day;

            return {
              ...day,
              isWorking: saved.isWorking,
              startTime: saved.startTime || '09:00',
              endTime: saved.endTime || '18:00'
            };
          });

          setSchedule(mergedSchedule);
          setHasSavedSchedule(true);
        }

        setLastSaved(result.data?.updatedAt || null);
        setDateOverrides(result.data?.dateOverrides || []);
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAvailability();

    return () => {
      active = false;
    };
  }, []);

  function updateDay(dayOfWeek, changes) {
    setSchedule(previous =>
      previous.map(day =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, ...changes }
          : day
      )
    );

    setMessage('');
    setError('');
  }

  function validateSchedule() {
    for (const day of schedule) {
      if (!day.isWorking) continue;

      const start = toMinutes(day.startTime);
      const end = toMinutes(day.endTime);

      if (start < 540 || end > 1080) {
        return `${day.dayName}: Working hours must be between 9:00 AM and 6:00 PM.`;
      }

      if (end <= start) {
        return `${day.dayName}: End time must be later than start time.`;
      }
    }

    return null;
  }

  async function handleSave(event) {
    event.preventDefault();

    const validationError = validateSchedule();

    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const tokenResponse = await fetch('/api/auth/csrf-token', {
        credentials: 'include'
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenResult.success) {
        throw new Error('Unable to obtain security token.');
      }

      const csrfToken = tokenResult.data?.csrfToken;

      if (!csrfToken) {
        throw new Error('Security token is missing.');
      }

      const response = await fetch(API_URL, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          weeklySchedule: schedule.map(day => ({
            dayOfWeek: day.dayOfWeek,
            isWorking: day.isWorking,
            startTime: day.isWorking ? day.startTime : null,
            endTime: day.isWorking ? day.endTime : null
          }))
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Unable to save availability.'
        );
      }

      setLastSaved(result.data?.updatedAt || new Date().toISOString());
      setHasSavedSchedule(true);
      setMessage('Your weekly availability has been saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedOverride = dateOverrides.find(item => item.date === selectedDate);
  const regularDay = schedule.find(item => item.dayOfWeek === dateWeekday(selectedDate));
  const regularHours = regularDay?.isWorking ? regularDay : null;
  const selectedIsPast = selectedDate < singaporeToday();
  const daysInMonth = new Date(Date.UTC(calendarMonth.year, calendarMonth.month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(calendarMonth.year, calendarMonth.month, 1)).getUTCDay();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];

  function selectCalendarDate(date) {
    setSelectedDate(date);
    setDateMessage('');
    setDateError('');
    const override = dateOverrides.find(item => item.date === date);
    const weekly = schedule.find(item => item.dayOfWeek === dateWeekday(date));
    setOverrideMode(override ? (override.isWorking ? 'custom' : 'blocked') : 'normal');
    setOverrideStart(override?.startTime || weekly?.startTime || '09:00');
    setOverrideEnd(override?.endTime || weekly?.endTime || '18:00');
  }

  function changeMonth(offset) {
    const date = new Date(Date.UTC(calendarMonth.year, calendarMonth.month + offset, 1));
    setCalendarMonth({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  }

  async function saveDateOverride() {
    setDateError('');
    setDateMessage('');
    if (selectedIsPast) {
      setDateError('Past dates cannot be modified.');
      return;
    }
    if (overrideMode === 'custom') {
      if (!overrideStart || !overrideEnd || toMinutes(overrideStart) < 540 ||
          toMinutes(overrideEnd) > 1080 || toMinutes(overrideEnd) <= toMinutes(overrideStart)) {
        setDateError('Choose valid hours between 9:00 AM and 6:00 PM.');
        return;
      }
    }
    setDateSaving(true);
    try {
      const token = await csrfToken();
      const isNormal = overrideMode === 'normal';
      const response = await fetch(
        isNormal ? `${API_URL}/date/${selectedDate}` : `${API_URL}/date`,
        {
          method: isNormal ? 'DELETE' : 'PUT',
          credentials: 'include',
          headers: { 'x-csrf-token': token, ...(!isNormal ? { 'Content-Type': 'application/json' } : {}) },
          ...(!isNormal ? { body: JSON.stringify({
            date: selectedDate,
            isWorking: overrideMode === 'custom',
            startTime: overrideMode === 'custom' ? overrideStart : null,
            endTime: overrideMode === 'custom' ? overrideEnd : null
          }) } : {})
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to update this date.');
      }
      setDateOverrides(previous => {
        const remaining = previous.filter(item => item.date !== selectedDate);
        return isNormal ? remaining : [...remaining, result.data.dateOverride].sort((a, b) => a.date.localeCompare(b.date));
      });
      setLastSaved(result.data?.updatedAt || new Date().toISOString());
      setDateMessage(isNormal ? 'Regular weekly hours restored for this date.' : 'Date availability saved successfully!');
    } catch (err) {
      setDateError(err.message);
    } finally {
      setDateSaving(false);
    }
  }

  const workingDays = schedule.filter(day => day.isWorking);

  if (loading) {
    return (
      <div className="panel" style={{ padding: '30px' }}>
        Loading your availability...
      </div>
    );
  }

  return (
    <section
      className="panel"
      style={{
        padding: '30px',
        marginTop: '30px'
      }}
    >
      <span className="eyebrow">Schedule Management</span>

      <h2 style={{ marginTop: '12px' }}>
        My Weekly Availability
      </h2>

      <p className="muted">
        Choose your working days and consultation hours.
        All times are in Singapore Time (SGT).
      </p>

      {!hasSavedSchedule && (
        <div
          style={{
            background: '#f4f1eb',
            padding: '16px',
            borderRadius: '12px',
            margin: '20px 0'
          }}
        >
          <strong>Suggested starting schedule</strong>
          <p style={{ marginBottom: 0 }}>
            Monday to Friday, 9:00 AM to 6:00 PM.
            You can customise these hours before saving.
          </p>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div
          style={{
            display: 'grid',
            gap: '12px',
            marginTop: '24px'
          }}
        >
          {schedule.map(day => (
            <div
              key={day.dayOfWeek}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(150px, 1fr) minmax(0, 2fr)',
                alignItems: 'center',
                gap: '18px',
                padding: '18px',
                border: '1px solid #e2d9d0',
                borderRadius: '12px',
                background: day.isWorking
                  ? '#ffffff'
                  : '#f8f6f3'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <input
                  type="checkbox"
                  checked={day.isWorking}
                  onChange={event =>
                    updateDay(day.dayOfWeek, {
                      isWorking: event.target.checked
                    })
                  }
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#512a10'
                  }}
                />

                {day.dayName}
              </label>

              {day.isWorking ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <label>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        marginBottom: '5px'
                      }}
                    >
                      Start
                    </span>

                    <input
                      type="time"
                      value={day.startTime}
                      min="09:00"
                      max="18:00"
                      step="1800"
                      onChange={event =>
                        updateDay(day.dayOfWeek, {
                          startTime: event.target.value
                        })
                      }
                      required
                    />
                  </label>

                  <span style={{ marginTop: '18px' }}>
                    to
                  </span>

                  <label>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        marginBottom: '5px'
                      }}
                    >
                      End
                    </span>

                    <input
                      type="time"
                      value={day.endTime}
                      min="09:00"
                      max="18:00"
                      step="1800"
                      onChange={event =>
                        updateDay(day.dayOfWeek, {
                          endTime: event.target.value
                        })
                      }
                      required
                    />
                  </label>
                </div>
              ) : (
                <span className="muted">
                  Unavailable / Day off
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#f4f1eb',
            borderRadius: '14px',
            padding: '22px',
            marginTop: '28px'
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Weekly Schedule Summary
          </h3>

          {workingDays.length === 0 ? (
            <p className="muted">
              You have not selected any working days.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {workingDays.map(day => (
                <div
                  key={day.dayOfWeek}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <strong>{day.dayName}</strong>
                  <span>
                    {formatTime(day.startTime)}
                    {' – '}
                    {formatTime(day.endTime)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: '#c62828',
              marginTop: '20px'
            }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            style={{
              color: '#287443',
              marginTop: '20px'
            }}
          >
            {message}
          </p>
        )}

        {lastSaved && (
          <p className="muted" style={{ marginTop: '16px' }}>
            Last saved:{' '}
            {new Date(lastSaved).toLocaleString('en-SG', {
              timeZone: 'Asia/Singapore',
              dateStyle: 'medium',
              timeStyle: 'short'
            })}
          </p>
        )}

        <button
          type="submit"
          className="pill"
          disabled={saving}
          style={{
            width: '100%',
            marginTop: '22px',
            padding: '16px'
          }}
        >
          {saving ? 'Saving Availability...' : 'Save Availability'}
        </button>
      </form>

      <div style={{ marginTop: 48, borderTop: '1px solid #e2d9d0', paddingTop: 30 }}>
        <span className="eyebrow">Date-specific availability</span>
        <h2>My Availability Calendar</h2>
        <p className="muted">Select a date to override your regular working hours. Times are in Singapore Time (SGT).</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))', gap: 24, marginTop: 24 }}>
          <div style={{ border: '1px solid #e2d9d0', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">←</button>
              <strong>{new Date(Date.UTC(calendarMonth.year, calendarMonth.month, 1)).toLocaleDateString('en-SG', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">→</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5 }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <span key={day} style={{ textAlign: 'center', fontSize: 12, color: '#777' }}>{day}</span>
              ))}
              {calendarCells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} />;
                const date = dateKey(calendarMonth.year, calendarMonth.month, day);
                const override = dateOverrides.find(item => item.date === date);
                const weekly = schedule.find(item => item.dayOfWeek === dateWeekday(date));
                const status = override ? (override.isWorking ? 'custom' : 'blocked') : weekly?.isWorking ? 'working' : 'off';
                const dotColor = { custom: '#c99637', blocked: '#c65c58', working: '#4c916a', off: '#aaa' }[status];
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => selectCalendarDate(date)}
                    aria-pressed={selectedDate === date}
                    title={`${date}: ${status}`}
                    style={{
                      minHeight: 48, borderRadius: 9, padding: 4,
                      border: selectedDate === date ? '2px solid #512a10' : '1px solid #e2d9d0',
                      background: selectedDate === date ? '#f4e9df' : '#fff',
                      color: date < singaporeToday() ? '#999' : '#292420',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4
                    }}
                  >
                    <span>{day}</span>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 18, fontSize: 12 }}>
              {[['#4c916a', 'Working'], ['#c65c58', 'Blocked'], ['#c99637', 'Custom hours'], ['#aaa', 'Day off']].map(([color, label]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ border: '1px solid #e2d9d0', borderRadius: 16, padding: 22 }}>
            <h3 style={{ marginTop: 0 }}>{new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</h3>
            <p className="muted">
              Regular schedule: {regularHours ? `${formatTime(regularHours.startTime)} – ${formatTime(regularHours.endTime)}` : 'Day off'}
            </p>
            {selectedOverride && <p className="muted">Current exception: {selectedOverride.isWorking ? `${formatTime(selectedOverride.startTime)} – ${formatTime(selectedOverride.endTime)}` : 'Blocked all day'}</p>}
            {selectedIsPast ? (
              <p className="muted">Past dates are read-only.</p>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="radio" name="dateOverrideMode" checked={overrideMode === 'normal'} onChange={() => setOverrideMode('normal')} /> Use regular weekly schedule
                </label>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="radio" name="dateOverrideMode" checked={overrideMode === 'blocked'} onChange={() => setOverrideMode('blocked')} /> Block entire day
                </label>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="radio" name="dateOverrideMode" checked={overrideMode === 'custom'} onChange={() => setOverrideMode('custom')} /> Set custom working hours
                </label>
                {overrideMode === 'custom' && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label>Start <input type="time" min="09:00" max="18:00" step="1800" value={overrideStart} onChange={event => setOverrideStart(event.target.value)} /></label>
                    <label>End <input type="time" min="09:00" max="18:00" step="1800" value={overrideEnd} onChange={event => setOverrideEnd(event.target.value)} /></label>
                  </div>
                )}
                <button type="button" className="pill" disabled={dateSaving} onClick={saveDateOverride} style={{ padding: 14 }}>
                  {dateSaving ? 'Saving...' : overrideMode === 'normal' ? 'Restore Regular Schedule' : 'Save Date Availability'}
                </button>
              </div>
            )}
            {dateError && <p role="alert" style={{ color: '#c62828' }}>{dateError}</p>}
            {dateMessage && <p role="status" style={{ color: '#287443' }}>{dateMessage}</p>}
            <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>Existing Pending or Confirmed bookings cannot be overridden by a conflicting schedule change.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
