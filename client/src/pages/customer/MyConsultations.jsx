
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = '/api';

function formatDate(value) {
  if (!value) return 'Date unavailable';

  return new Date(value).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Singapore'
  });
}

function formatTime(value) {
  if (!value) return 'Time unavailable';

  return new Date(value).toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Singapore'
  });
}

export default function MyConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadConsultations() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `${API_BASE}/consultations/mine`,
          {
            credentials: 'include'
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
            'Unable to load consultation history.'
          );
        }

        if (!cancelled) {
          setConsultations(result.data || []);
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

    loadConsultations();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page section">
      <span className="eyebrow">
        Customer account
      </span>

      <h1>My Consultations</h1>

      <p className="muted">
        View your consultation requests and appointment
        details.
      </p>

      {loading && (
        <div className="panel" style={{ padding: '24px' }}>
          Loading your consultations...
        </div>
      )}

      {!loading && error && (
        <div
          className="panel"
          role="alert"
          style={{ padding: '24px' }}
        >
          <h3>Unable to load consultations</h3>
          <p>{error}</p>
          <Link to="/projects" className="text-link">
            Browse Projects →
          </Link>
        </div>
      )}

      {!loading &&
        !error &&
        consultations.length === 0 && (
          <div
            className="panel"
            style={{ padding: '32px' }}
          >
            <h3>No consultations yet</h3>

            <p>
              You haven't requested any consultations.
              Explore interior design projects to find
              a designer.
            </p>

            <Link to="/projects" className="text-link">
              Explore Projects →
            </Link>
          </div>
        )}

      {!loading &&
        !error &&
        consultations.length > 0 && (
          <div
            style={{
              display: 'grid',
              gap: '20px',
              marginTop: '24px'
            }}
          >
            {consultations.map(consultation => (
              <article
                key={consultation.requestId}
                className="panel"
                style={{ padding: '28px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <h2 style={{ margin: 0 }}>
                    {consultation.designerName}
                  </h2>

                  <span
                    style={{
                      display: 'inline-block',
                      padding: '8px 14px',
                      borderRadius: '999px',
                      backgroundColor: '#f4eee6',
                      color: '#603715',
                      fontWeight: 600
                    }}
                  >
                    {consultation.requestStatus}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '14px',
                    marginTop: '22px'
                  }}
                >
                  <div>
                    <strong>Appointment date</strong>
                    <p>
                      {formatDate(consultation.startTime)}
                    </p>
                  </div>

                  <div>
                    <strong>Appointment time</strong>
                    <p>
                      {formatTime(consultation.startTime)}
                      {consultation.endTime &&
                        ` – ${formatTime(
                          consultation.endTime
                        )}`}
                    </p>
                  </div>

                  <div>
                    <strong>Renovation requirements</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      {consultation.renovationRequirements}
                    </p>
                  </div>

                  <div>
                    <strong>Requested on</strong>
                    <p>
                      {formatDate(consultation.createdAt)}
                    </p>
                  </div>

                  <div>
                    <strong>Request ID</strong>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {consultation.requestId}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
