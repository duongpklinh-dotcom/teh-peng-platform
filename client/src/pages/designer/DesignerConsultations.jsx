
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { Link } from 'react-router-dom';
import DesignerAvailability from './DesignerAvailability';

const dashboardSections = [
  {
    title: 'My Availability',
    description:
      'Manage your working dates and available consultation hours.',
    icon: '📅',
    status: 'Available now'
  },
  {
    title: 'Consultation Requests',
    description:
      'Review customer bookings and accept or reject requests.',
    icon: '📋',
    status: 'Available now'
  },
  {
    title: 'Messages',
    description:
      'Communicate privately with customers after confirming consultations.',
    icon: '💬',
    status: 'Available now'
  },
  {
    title: 'Notifications',
    description:
      'Receive updates about bookings, cancellations and messages.',
    icon: '🔔',
    status: 'Planned'
  }
];

const statusStyles = {
  Pending: {
    background: '#fff3d6',
    color: '#926300'
  },
  Confirmed: {
    background: '#e2f3e8',
    color: '#24643d'
  },
  Rejected: {
    background: '#fbe7e7',
    color: '#a13e3e'
  }
};

const filters = [
  'All',
  'Pending',
  'Confirmed',
  'Rejected'
];

function formatAppointment(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function formatTime(value) {
  if (!value) return 'Unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf-token', {
    credentials: 'include'
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.error || 'Unable to retrieve security token.'
    );
  }

  const token =
    result.csrfToken ||
    result.data?.csrfToken ||
    result.token;

  if (!token) {
    throw new Error('Security token is missing.');
  }

  return token;
}

const MAX_MESSAGE_LENGTH = 2000;

function DesignerChat({ consultationId, customerName, designerId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const messagesContainerRef = useRef(null);
  const activeRef = useRef(false);
  const fetchingRef = useRef(false);
  const initialLoadedRef = useRef(false);
  const shouldScrollRef = useRef(true);
  const lastMessageIdRef = useRef(null);

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetch(
        `/api/consultation-messages/${consultationId}`,
        { credentials: 'include', cache: 'no-store' }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to load messages.');
      }
      if (!activeRef.current) return;

      const incoming = Array.isArray(result.data) ? result.data : [];
      const container = messagesContainerRef.current;
      const nearBottom = !container ||
        container.scrollHeight - container.scrollTop - container.clientHeight < 90;
      const latestId = incoming.length
        ? incoming[incoming.length - 1].messageId
        : null;

      // Only scroll when the user is already at the bottom, or on first load.
      if (!initialLoadedRef.current || nearBottom) {
        shouldScrollRef.current = true;
      }
      initialLoadedRef.current = true;
      lastMessageIdRef.current = latestId;

      setMessages(previous => {
        const same = previous.length === incoming.length &&
          previous.every((message, index) =>
            message.messageId === incoming[index].messageId &&
            message.messageText === incoming[index].messageText
          );
        return same ? previous : incoming;
      });
      setError('');
    } catch (err) {
      if (activeRef.current && !silent) {
        setError(err.message || 'Unable to load messages.');
      }
    } finally {
      fetchingRef.current = false;
      if (activeRef.current && !silent) setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => {
    activeRef.current = true;
    initialLoadedRef.current = false;
    shouldScrollRef.current = true;
    loadMessages();

    const intervalId = window.setInterval(() => {
      loadMessages({ silent: true });
    }, 5000);

    const handleReturn = () => {
      if (document.visibilityState === 'visible') {
        loadMessages({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', handleReturn);
    window.addEventListener('focus', handleReturn);

    return () => {
      activeRef.current = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleReturn);
      window.removeEventListener('focus', handleReturn);
    };
  }, [loadMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!loading && container && shouldScrollRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollRef.current = false;
    }
  }, [messages, loading]);

  async function handleSend(event) {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH || sending || loading) return;

    try {
      setSending(true);
      setError('');
      setSuccessMessage('');
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        `/api/consultation-messages/${consultationId}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ messageText: text })
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to send message.');
      }
      shouldScrollRef.current = true;
      setMessages(previous => previous.some(message =>
        message.messageId === result.data.messageId
      ) ? previous : [...previous, result.data]);
      setMessageText('');
      setSuccessMessage('Message sent successfully.');
    } catch (err) {
      setError(err.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section style={{
      marginTop: '22px', border: '1px solid #e5ded4',
      borderRadius: '14px', overflow: 'hidden'
    }}>
      <div style={{
        padding: '18px 22px', background: '#f4f1eb',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: '12px'
      }}>
        <div>
          <h4 style={{ margin: 0 }}>Conversation with {customerName}</h4>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: '13px' }}>
            Private consultation conversation
          </p>
        </div>
        <button type="button" onClick={onClose}
          aria-label="Close conversation" style={{
            border: 'none', background: 'transparent',
            fontSize: '24px', cursor: 'pointer', color: '#292420'
          }}>×</button>
      </div>

      <div ref={messagesContainerRef} style={{
        padding: '20px', minHeight: '180px', maxHeight: '380px',
        overflowY: 'auto', background: '#faf8f5',
        display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        {loading ? (
          <p className="muted">Loading conversation...</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', padding: '20px' }}>
            <div style={{ fontSize: '32px' }}>💬</div>
            <h4>No messages yet</h4>
            <p className="muted">Start a conversation with {customerName}.</p>
          </div>
        ) : messages.map(message => {
          const isOwnMessage =
            String(message.senderId) === String(designerId);
          return (
            <div key={message.messageId} style={{
              alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}>
              <div style={{
                padding: '12px 16px', borderRadius: '14px',
                background: isOwnMessage ? '#292420' : '#ffffff',
                color: isOwnMessage ? '#ffffff' : '#292420',
                border: isOwnMessage ? 'none' : '1px solid #e5ded4',
                overflowWrap: 'anywhere', whiteSpace: 'pre-wrap'
              }}>{message.messageText}</div>
              <p style={{
                fontSize: '11px', color: '#847a70', margin: '5px 4px 0',
                textAlign: isOwnMessage ? 'right' : 'left'
              }}>
                {isOwnMessage ? 'You' : customerName}
                {' · '}{formatTime(message.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '18px 20px', borderTop: '1px solid #e5ded4' }}>
        {error && (
          <div role="alert" style={{ color: '#a13e3e', marginBottom: '12px' }}>
            <p>{error}</p>
            <button type="button" onClick={() => loadMessages()}
              disabled={loading || sending} style={{
                border: 'none', background: 'transparent',
                color: '#603715', textDecoration: 'underline', cursor: 'pointer'
              }}>Refresh messages</button>
          </div>
        )}
        {successMessage && (
          <p role="status" style={{ color: '#24643d' }}>{successMessage}</p>
        )}
        <form onSubmit={handleSend}>
          <textarea value={messageText} onChange={event => {
            setMessageText(event.target.value);
            setSuccessMessage('');
          }} placeholder="Type your message..." maxLength={MAX_MESSAGE_LENGTH}
            rows={3} disabled={sending || loading} aria-label="Message to customer"
            style={{
              width: '100%', padding: '14px', borderRadius: '10px',
              border: '1px solid #d9d1c7', resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box'
            }} />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap'
          }}>
            <span className="muted" style={{ fontSize: '12px' }}>
              {messageText.length}/{MAX_MESSAGE_LENGTH}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => loadMessages()}
                disabled={loading || sending} style={{
                  padding: '12px 16px', borderRadius: '8px',
                  border: '1px solid #d9d1c7', background: '#ffffff',
                  color: '#292420', cursor: 'pointer'
                }}>Refresh</button>
              <button type="submit"
                disabled={sending || loading || !messageText.trim()}
                style={{
                  padding: '12px 22px', borderRadius: '8px', border: 'none',
                  background: '#292420', color: '#ffffff', fontWeight: 600,
                  opacity: sending || loading || !messageText.trim() ? 0.6 : 1,
                  cursor: sending || loading ? 'not-allowed' : 'pointer'
                }}>
                {sending ? 'Sending...' : 'Send Message →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function ConsultationRequests({ designerId }) {
  const [requests, setRequests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openChatId, setOpenChatId] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        '/api/designer-consultations/mine',
        {
          credentials: 'include'
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          'Unable to load consultation requests.'
        );
      }

      setRequests(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      setError(
        err.message || 'Unable to load consultations.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleReview(request, action) {
    if (processingId) return;

    if (request.requestStatus !== 'Pending') {
      return;
    }

    if (action === 'reject') {
      const confirmed = window.confirm(
        `Are you sure you want to reject the consultation requested by ${request.customerName}?`
      );

      if (!confirmed) return;
    }

    try {
      setProcessingId(request.requestId);
      setError('');
      setSuccessMessage('');

      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `/api/designer-consultations/${request.requestId}/${action}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'X-CSRF-Token': csrfToken
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          `Unable to ${action} consultation.`
        );
      }

      setSuccessMessage(
        result.message ||
        `Consultation ${
          action === 'approve' ? 'approved' : 'rejected'
        } successfully.`
      );

      await loadRequests();
    } catch (err) {
      setError(
        err.message || 'Unable to update consultation.'
      );
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = requests.filter(
    request => request.requestStatus === 'Pending'
  ).length;

  const confirmedCount = requests.filter(
    request => request.requestStatus === 'Confirmed'
  ).length;

  const rejectedCount = requests.filter(
    request => request.requestStatus === 'Rejected'
  ).length;

  const filteredRequests = requests.filter(
    request =>
      activeFilter === 'All' ||
      request.requestStatus === activeFilter
  );

  const filterCounts = {
    All: requests.length,
    Pending: pendingCount,
    Confirmed: confirmedCount,
    Rejected: rejectedCount
  };

  return (
    <section
      className="panel"
      style={{
        marginTop: '30px',
        padding: '26px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <span className="eyebrow">
            Appointment Management
          </span>

          <h2 style={{ marginBottom: '8px' }}>
            Consultation Requests
          </h2>

          <p className="muted" style={{ margin: 0 }}>
            Review customer renovation requirements
            and manage appointment requests.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={loadRequests}
          disabled={loading || Boolean(processingId)}
          style={{
            padding: '10px 18px'
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
          marginTop: '24px'
        }}
      >
        {[
          {
            label: 'Total Requests',
            value: requests.length
          },
          {
            label: 'Pending',
            value: pendingCount
          },
          {
            label: 'Confirmed',
            value: confirmedCount
          },
          {
            label: 'Rejected',
            value: rejectedCount
          }
        ].map(item => (
          <div
            key={item.label}
            style={{
              background: '#f4f1eb',
              borderRadius: '12px',
              padding: '18px'
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#292420'
              }}
            >
              {item.value}
            </div>

            <div
              style={{
                fontSize: '13px',
                color: '#746b63',
                marginTop: '4px'
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '24px',
          marginBottom: '24px'
        }}
      >
        {filters.map(filter => {
          const selected = activeFilter === filter;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '10px 16px',
                borderRadius: '24px',
                border: selected
                  ? '1px solid #292420'
                  : '1px solid #ded8cf',
                background: selected
                  ? '#292420'
                  : '#ffffff',
                color: selected
                  ? '#ffffff'
                  : '#292420',
                fontWeight: selected ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              {filter} ({filterCounts[filter]})
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: '#fbe7e7',
            color: '#a13e3e',
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '18px'
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            background: '#e2f3e8',
            color: '#24643d',
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '18px'
          }}
        >
          {successMessage}
        </div>
      )}

      {loading ? (
        <p className="muted">
          Loading consultation requests...
        </p>
      ) : filteredRequests.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '45px 20px',
            background: '#f9f7f3',
            borderRadius: '12px'
          }}
        >
          <div style={{ fontSize: '36px' }}>📋</div>

          <h3>No consultation requests found</h3>

          <p className="muted">
            {activeFilter === 'All'
              ? 'Customer consultation requests will appear here once submitted.'
              : `There are no ${activeFilter.toLowerCase()} consultation requests.`}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {filteredRequests.map(request => {
            const isPending =
              request.requestStatus === 'Pending';
            const isConfirmed =
              request.requestStatus === 'Confirmed';
            const chatIsOpen = openChatId === request.requestId;

            const isProcessing =
              processingId === request.requestId;

            const statusStyle =
              statusStyles[request.requestStatus] || {
                background: '#eeeeee',
                color: '#555555'
              };

            return (
              <article
                key={request.requestId}
                style={{
                  border: '1px solid #e5ded4',
                  borderRadius: '14px',
                  padding: '22px',
                  background: '#ffffff'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '14px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: '0 0 8px'
                      }}
                    >
                      {request.customerName}
                    </h3>

                    {request.customerEmail && (
                      <p
                        className="muted"
                        style={{
                          margin: '0 0 8px'
                        }}
                      >
                        {request.customerEmail}
                      </p>
                    )}

                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600
                      }}
                    >
                      📅 {formatAppointment(
                        request.startTime
                      )}
                    </p>

                    <p
                      className="muted"
                      style={{
                        margin: '6px 0 0'
                      }}
                    >
                      Appointment ends at{' '}
                      {formatTime(request.endTime)}
                    </p>
                  </div>

                  <span
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      ...statusStyle
                    }}
                  >
                    {request.requestStatus}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: '20px',
                    padding: '18px',
                    background: '#f9f7f3',
                    borderRadius: '10px'
                  }}
                >
                  <strong>
                    Renovation Requirements
                  </strong>

                  <p
                    style={{
                      margin: '10px 0 0',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.7
                    }}
                  >
                    {request.renovationRequirements ||
                      'No requirements provided.'}
                  </p>
                </div>

                <p
                  className="muted"
                  style={{
                    marginTop: '14px',
                    fontSize: '13px'
                  }}
                >
                  Booking method:{' '}
                  {request.bookingMethod === 'custom'
                    ? 'Calendar Booking'
                    : 'Recommended Slot'}
                </p>

                {isPending && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginTop: '18px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleReview(request, 'approve')
                      }
                      disabled={Boolean(processingId)}
                      style={{
                        padding: '12px 22px',
                        background: '#2f6b46',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: processingId
                          ? 'not-allowed'
                          : 'pointer'
                      }}
                    >
                      {isProcessing
                        ? 'Processing...'
                        : '✓ Approve'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleReview(request, 'reject')
                      }
                      disabled={Boolean(processingId)}
                      style={{
                        padding: '12px 22px',
                        background: '#ffffff',
                        color: '#a13e3e',
                        border: '1px solid #a13e3e',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: processingId
                          ? 'not-allowed'
                          : 'pointer'
                      }}
                    >
                      {isProcessing
                        ? 'Processing...'
                        : '✕ Reject'}
                    </button>
                  </div>
                )}

                {isConfirmed && (
                  <div style={{ marginTop: '18px' }}>
                    <button type="button" onClick={() =>
                      setOpenChatId(chatIsOpen ? null : request.requestId)
                    } style={{
                      padding: '12px 22px', background: '#292420',
                      color: '#ffffff', border: 'none',
                      borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                    }}>
                      {chatIsOpen ? 'Close Conversation' : '💬 Message Customer'}
                    </button>
                    {chatIsOpen && (
                      <DesignerChat
                        consultationId={request.requestId}
                        customerName={request.customerName}
                        designerId={designerId || request.designerId}
                        onClose={() => setOpenChatId(null)}
                      />
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function DesignerConsultations({ user }) {
  return (
    <div
      className="page section"
      style={{
        maxWidth: '1250px',
        margin: '0 auto'
      }}
    >
      <Link to="/" className="text-link">
        ← Back to Home
      </Link>

      <div style={{ margin: '35px 0' }}>
        <span className="eyebrow">
          Interior Designer Workspace
        </span>

        <h1>Consultation Management</h1>

        <p className="muted">
          Welcome, {user?.name || 'Designer'}.
          Manage your availability, customer appointments,
          messages and notifications in one place.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '22px'
        }}
      >
        {dashboardSections.map(section => (
          <div
            key={section.title}
            className="panel"
            style={{
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              minHeight: '250px'
            }}
          >
            <span
              style={{
                fontSize: '34px',
                lineHeight: 1
              }}
              aria-hidden="true"
            >
              {section.icon}
            </span>

            <h2
              style={{
                margin: 0,
                fontSize: '24px'
              }}
            >
              {section.title}
            </h2>

            <p
              className="muted"
              style={{
                flex: 1,
                margin: 0
              }}
            >
              {section.description}
            </p>

            <span
              style={{
                alignSelf: 'flex-start',
                padding: '8px 14px',
                background: '#f4f1eb',
                borderRadius: '20px',
                fontSize: '13px',
                color: '#69452e'
              }}
            >
              {section.status}
            </span>
          </div>
        ))}
      </div>

      {/* Existing designer calendar */}
      <DesignerAvailability />

      {/* NEW: Customer consultation management */}
      <ConsultationRequests
        designerId={user?._id || user?.id || user?.userId}
      />

      <div
        className="panel"
        style={{
          marginTop: '30px',
          padding: '26px'
        }}
      >
        <h2>How consultation management works</h2>

        <p>
          First, configure your available working dates
          and times. Customers will then be able to
          select appointments from your calendar.
        </p>

        <p>
          When a customer requests an appointment,
          you can review their renovation requirements
          and accept or reject the consultation.
        </p>

        <p>
          Once a consultation is confirmed, you and
          the customer will be able to communicate
          through a private conversation.
        </p>
      </div>
    </div>
  );
}
