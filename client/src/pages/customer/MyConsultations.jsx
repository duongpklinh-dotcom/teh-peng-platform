
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { Link } from 'react-router-dom';

const API_BASE = '/api';
const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_REFRESH_INTERVAL = 5000;

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Singapore'
  });
}

function formatTime(value) {
  if (!value) return 'Time unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return date.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Singapore'
  });
}

function getStatusStyle(status) {
  if (status === 'Confirmed') {
    return {
      backgroundColor: '#e2f3e8',
      color: '#24643d'
    };
  }

  if (status === 'Rejected') {
    return {
      backgroundColor: '#fbe7e7',
      color: '#a13e3e'
    };
  }

  return {
    backgroundColor: '#fff3d6',
    color: '#926300'
  };
}

async function getCsrfToken() {
  const response = await fetch(
    `${API_BASE}/auth/csrf-token`,
    {
      credentials: 'include'
    }
  );

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

// Private messaging for a confirmed consultation.
function ConsultationChat({
  consultationId,
  designerName,
  customerId,
  onClose
}) {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const messagesContainerRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const sendingRef = useRef(false);
  const shouldScrollRef = useRef(true);

  const loadMessages = useCallback(async ({ initial = false } = {}) => {
    const sequence = ++requestSequenceRef.current;

    if (initial) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetch(
        `${API_BASE}/consultation-messages/${consultationId}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Unable to load messages.');
      }

      if (sequence !== requestSequenceRef.current) return;
      if (sendingRef.current) return;

      const nextMessages = Array.isArray(result.data) ? result.data : [];
      setMessages(previous => {
        const unchanged =
          previous.length === nextMessages.length &&
          previous.every((message, index) =>
            message.messageId === nextMessages[index].messageId
          );
        return unchanged ? previous : nextMessages;
      });
      setError('');
    } catch (err) {
      if (sequence === requestSequenceRef.current) {
        setError(err.message || 'Unable to load messages.');
      }
    } finally {
      if (initial && sequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [consultationId]);

  useEffect(() => {
    loadMessages({ initial: true });

    const intervalId = window.setInterval(() => {
      if (!sendingRef.current) {
        loadMessages();
      }
    }, MESSAGE_REFRESH_INTERVAL);

    // Background tabs may have throttled timers. Check immediately on return.
    const refreshOnReturn = () => {
      if (!document.hidden && !sendingRef.current) {
        loadMessages();
      }
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('focus', refreshOnReturn);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('focus', refreshOnReturn);
      requestSequenceRef.current += 1;
    };
  }, [loadMessages]);

  function handleMessageScroll() {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldScrollRef.current = distanceFromBottom < 80;
  }

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!loading && container && shouldScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(event) {
    event.preventDefault();

    const trimmedMessage = messageText.trim();

    if (
      !trimmedMessage ||
      trimmedMessage.length > MAX_MESSAGE_LENGTH ||
      sending
    ) {
      return;
    }

    try {
      sendingRef.current = true;
      requestSequenceRef.current += 1;
      setSending(true);
      setError('');
      setSuccessMessage('');

      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `${API_BASE}/consultation-messages/${consultationId}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            messageText: trimmedMessage
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Unable to send message.'
        );
      }

      setMessageText('');

      shouldScrollRef.current = true;
      setMessages(previous =>
        previous.some(item => item.messageId === result.data.messageId)
          ? previous
          : [...previous, result.data]
      );

      setSuccessMessage(
        'Message sent successfully.'
      );

    } catch (err) {
      setError(
        err.message || 'Unable to send message.'
      );

    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section
      style={{
        marginTop: '24px',
        border: '1px solid #e5ded4',
        borderRadius: '14px',
        overflow: 'hidden'
      }}
    >
      {/* Conversation header */}
      <div
        style={{
          padding: '18px 22px',
          background: '#f4f1eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>
            Conversation with {designerName}
          </h3>

          <p
            className="muted"
            style={{
              margin: '6px 0 0',
              fontSize: '13px'
            }}
          >
            Private consultation conversation · Auto-refreshes every 5 seconds
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversation"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#292420'
          }}
        >
          ×
        </button>
      </div>

      {/* Message history */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessageScroll}
        style={{
          padding: '20px',
          minHeight: '180px',
          maxHeight: '380px',
          overflowY: 'auto',
          background: '#faf8f5',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {loading ? (
          <p className="muted">
            Loading conversation...
          </p>
        ) : messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              margin: 'auto',
              padding: '20px'
            }}
          >
            <div style={{ fontSize: '32px' }}>
              💬
            </div>

            <h3>No messages yet</h3>

            <p className="muted">
              Start a conversation with {designerName}
              about your renovation plans.
            </p>
          </div>
        ) : (
          messages.map(message => {
            // Compare the sender's MongoDB ID with
            // the authenticated customer's ID.
            const isOwnMessage =
              String(message.senderId) ===
              String(customerId);

            return (
              <div
                key={message.messageId}
                style={{
                  alignSelf: isOwnMessage
                    ? 'flex-end'
                    : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: isOwnMessage
                      ? '#292420'
                      : '#ffffff',
                    color: isOwnMessage
                      ? '#ffffff'
                      : '#292420',
                    border: isOwnMessage
                      ? 'none'
                      : '1px solid #e5ded4',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {message.messageText}
                </div>

                <p
                  style={{
                    fontSize: '11px',
                    color: '#847a70',
                    margin: '5px 4px 0',
                    textAlign: isOwnMessage
                      ? 'right'
                      : 'left'
                  }}
                >
                  {isOwnMessage
                    ? 'You'
                    : designerName}
                  {' · '}
                  {formatTime(message.createdAt)}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Message input */}
      <div
        style={{
          padding: '18px 20px',
          borderTop: '1px solid #e5ded4'
        }}
      >
        {error && (
          <div
            role="alert"
            style={{
              color: '#a13e3e',
              marginBottom: '12px'
            }}
          >
            <p>{error}</p>

            {!loading && (
              <button
                type="button"
                onClick={() => loadMessages()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#603715',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Refresh messages
              </button>
            )}
          </div>
        )}

        {successMessage && (
          <p
            role="status"
            style={{
              color: '#24643d',
              marginTop: 0
            }}
          >
            {successMessage}
          </p>
        )}

        <form onSubmit={handleSend}>
          <textarea
            value={messageText}
            onChange={event => {
              setMessageText(event.target.value);
              setSuccessMessage('');
            }}
            placeholder="Type your message..."
            maxLength={MAX_MESSAGE_LENGTH}
            rows={3}
            disabled={sending || loading}
            aria-label="Message to designer"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #d9d1c7',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginTop: '12px',
              flexWrap: 'wrap'
            }}
          >
            <span
              className="muted"
              style={{ fontSize: '12px' }}
            >
              {messageText.length}/{MAX_MESSAGE_LENGTH}
            </span>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}
            >
              <button
                type="button"
                onClick={() => loadMessages()}
                disabled={loading || sending}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d9d1c7',
                  background: '#ffffff',
                  color: '#292420',
                  cursor: loading || sending
                    ? 'not-allowed'
                    : 'pointer'
                }}
              >
                Refresh
              </button>

              <button
                type="submit"
                disabled={
                  sending ||
                  loading ||
                  !messageText.trim()
                }
                style={{
                  padding: '12px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#292420',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: sending || loading
                    ? 'not-allowed'
                    : 'pointer',
                  opacity:
                    sending ||
                    loading ||
                    !messageText.trim()
                      ? 0.6
                      : 1
                }}
              >
                {sending
                  ? 'Sending...'
                  : 'Send Message →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export default function MyConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openChatId, setOpenChatId] = useState(null);

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

        if (!result.customerId) {
          throw new Error(
            'Customer identity is missing from the consultation response.'
          );
        }

        if (!cancelled) {
          setCustomerId(result.customerId);
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
        View your consultation requests, appointment
        details and private conversations.
      </p>

      {loading && (
        <div
          className="panel"
          style={{ padding: '24px' }}
        >
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
            {consultations.map(consultation => {
              const isConfirmed =
                consultation.requestStatus === 'Confirmed';

              const chatIsOpen =
                openChatId === consultation.requestId;

              return (
                <article
                  key={consultation.requestId}
                  className="panel"
                  style={{ padding: '28px' }}
                >
                  {/* Consultation heading */}
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
                        fontWeight: 600,
                        ...getStatusStyle(
                          consultation.requestStatus
                        )
                      }}
                    >
                      {consultation.requestStatus}
                    </span>
                  </div>

                  {/* Consultation details */}
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
                        {formatDate(
                          consultation.startTime
                        )}
                      </p>
                    </div>

                    <div>
                      <strong>Appointment time</strong>
                      <p>
                        {formatTime(
                          consultation.startTime
                        )}
                        {consultation.endTime &&
                          ` – ${formatTime(
                            consultation.endTime
                          )}`}
                      </p>
                    </div>

                    <div>
                      <strong>Renovation requirements</strong>
                      <p
                        style={{
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {consultation.renovationRequirements}
                      </p>
                    </div>

                    <div>
                      <strong>Requested on</strong>
                      <p>
                        {formatDate(
                          consultation.createdAt
                        )}
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

                  {/* Messaging access */}
                  {isConfirmed ? (
                    <div
                      style={{
                        marginTop: '24px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenChatId(
                            chatIsOpen
                              ? null
                              : consultation.requestId
                          )
                        }
                        style={{
                          padding: '12px 22px',
                          background: '#292420',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {chatIsOpen
                          ? 'Close Conversation'
                          : '💬 Message Designer'}
                      </button>

                      {chatIsOpen && (
                        <ConsultationChat
                          consultationId={
                            consultation.requestId
                          }
                          designerName={
                            consultation.designerName
                          }
                          customerId={customerId}
                          onClose={() =>
                            setOpenChatId(null)
                          }
                        />
                      )}
                    </div>
                  ) : (
                    <p
                      className="muted"
                      style={{
                        marginTop: '24px',
                        fontSize: '13px'
                      }}
                    >
                      Messaging becomes available once
                      your consultation is confirmed.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
    </div>
  );
}
