// frontend/src/components/UpcomingEventsPanel.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function UpcomingEventsPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/auth/google/calendar', {
        params: { daysBack: 0, daysForward: 2 }
      });

      const allEvents = response.data.events || [];
      console.log('📅 Fetched events:', allEvents); // Debug log
      
      const now = new Date();
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      dayAfterTomorrow.setHours(23, 59, 59, 999);

      // Filter events for today and tomorrow
      const filtered = allEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= now && eventDate <= dayAfterTomorrow;
      });

      console.log('📅 Filtered events for today/tomorrow:', filtered); // Debug log
      setEvents(filtered);
    } catch (error) {
      console.error('Failed to fetch upcoming events:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupEventsByDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const grouped = {
      today: [],
      tomorrow: []
    };

    events.forEach(event => {
      const eventDate = new Date(event.start);
      const eventDateOnly = new Date(eventDate);
      eventDateOnly.setHours(0, 0, 0, 0);

      console.log('🔍 Comparing:', {
        eventDate: event.start,
        eventDateOnly: eventDateOnly.toISOString(),
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString()
      }); // Debug log

      if (eventDateOnly.getTime() === today.getTime()) {
        grouped.today.push(event);
      } else if (eventDateOnly.getTime() === tomorrow.getTime()) {
        grouped.tomorrow.push(event);
      }
    });

    console.log('📊 Grouped events:', grouped); // Debug log
    return grouped;
  };

  const formatEventTime = (event) => {
    if (event.isAllDay) {
      return 'All Day';
    }
    const date = new Date(event.start);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getEventIcon = (summary) => {
    const lower = summary.toLowerCase();
    if (lower.includes('birthday')) return '🎂';
    if (lower.includes('meeting') || lower.includes('call')) return '📞';
    if (lower.includes('lunch') || lower.includes('dinner')) return '🍽️';
    if (lower.includes('review')) return '📋';
    if (lower.includes('renewal')) return '📄';
    return '📅';
  };

  const grouped = groupEventsByDay();
  const totalEvents = events.length;

  if (collapsed) {
    return (
      <div style={{
        background: '#071127',
        padding: 12,
        borderRadius: 8,
        border: '1px solid #1e293b',
        marginBottom: 16
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setCollapsed(false)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
              Upcoming Events
            </span>
            <span style={{
              background: '#3b82f6',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 'bold'
            }}>
              {totalEvents}
            </span>
          </div>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: 18,
            cursor: 'pointer',
            padding: 0
          }}>
            ▼
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#071127',
      padding: 16,
      borderRadius: 8,
      border: '1px solid #1e293b',
      marginBottom: 16
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <h4 style={{ margin: 0, fontSize: 14, color: '#e2e8f0' }}>
            Upcoming Events
          </h4>
          <span style={{
            background: '#3b82f6',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 'bold'
          }}>
            {totalEvents}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchUpcomingEvents}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#60a5fa',
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: 4,
              opacity: loading ? 0.5 : 1
            }}
            title="Refresh"
          >
            🔄
          </button>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
              padding: 0
            }}
          >
            ▲
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: 20,
          color: '#64748b',
          fontSize: 13
        }}>
          Loading events...
        </div>
      ) : totalEvents === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 20,
          color: '#64748b',
          fontSize: 13
        }}>
          No events scheduled for today or tomorrow
        </div>
      ) : (
        <>
          {/* Debug info - remove after fixing */}
          <div style={{
            fontSize: 10,
            color: '#64748b',
            marginBottom: 8,
            padding: 8,
            background: '#0a1628',
            borderRadius: 4
          }}>
            Debug: Total {totalEvents} event(s) | Today: {grouped.today.length} | Tomorrow: {grouped.tomorrow.length}
          </div>

          {/* Show all events if grouping fails */}
          {grouped.today.length === 0 && grouped.tomorrow.length === 0 && totalEvents > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#94a3b8',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Upcoming ({totalEvents})
              </div>
              {events.map((event, index) => (
                <div
                  key={index}
                  style={{
                    padding: '10px 12px',
                    background: '#041022',
                    border: '1px solid #1e293b',
                    borderRadius: 6,
                    marginBottom: 8
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: 4
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flex: 1
                    }}>
                      <span style={{ fontSize: 14 }}>
                        {getEventIcon(event.summary)}
                      </span>
                      <span style={{
                        fontSize: 13,
                        color: '#e2e8f0',
                        fontWeight: 500
                      }}>
                        {event.summary}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: '#60a5fa',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      marginLeft: 8
                    }}>
                      {formatEventTime(event)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#64748b',
                    marginLeft: 20
                  }}>
                    📆 {new Date(event.start).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: event.isAllDay ? undefined : '2-digit',
                      minute: event.isAllDay ? undefined : '2-digit'
                    })}
                  </div>
                  {event.location && (
                    <div style={{
                      fontSize: 11,
                      color: '#64748b',
                      marginLeft: 20
                    }}>
                      📍 {event.location}
                    </div>
                  )}
                  {event.attendees?.length > 0 && (
                    <div style={{
                      fontSize: 11,
                      color: '#64748b',
                      marginLeft: 20
                    }}>
                      👥 {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Today's Events */}
              {grouped.today.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#94a3b8',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Today ({grouped.today.length})
                  </div>
                  {grouped.today.map((event, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '10px 12px',
                        background: '#041022',
                        border: '1px solid #1e293b',
                        borderRadius: 6,
                        marginBottom: 8
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: 4
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flex: 1
                        }}>
                          <span style={{ fontSize: 14 }}>
                            {getEventIcon(event.summary)}
                          </span>
                          <span style={{
                            fontSize: 13,
                            color: '#e2e8f0',
                            fontWeight: 500
                          }}>
                            {event.summary}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 12,
                          color: '#60a5fa',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          marginLeft: 8
                        }}>
                          {formatEventTime(event)}
                        </span>
                      </div>
                      {event.location && (
                        <div style={{
                          fontSize: 11,
                          color: '#64748b',
                          marginLeft: 20
                        }}>
                          📍 {event.location}
                        </div>
                      )}
                      {event.attendees?.length > 0 && (
                        <div style={{
                          fontSize: 11,
                          color: '#64748b',
                          marginLeft: 20
                        }}>
                          👥 {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tomorrow's Events */}
              {grouped.tomorrow.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#94a3b8',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Tomorrow ({grouped.tomorrow.length})
                  </div>
                  {grouped.tomorrow.map((event, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '10px 12px',
                        background: '#041022',
                        border: '1px solid #1e293b',
                        borderRadius: 6,
                        marginBottom: 8
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: 4
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flex: 1
                        }}>
                          <span style={{ fontSize: 14 }}>
                            {getEventIcon(event.summary)}
                          </span>
                          <span style={{
                            fontSize: 13,
                            color: '#e2e8f0',
                            fontWeight: 500
                          }}>
                            {event.summary}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 12,
                          color: '#a78bfa',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          marginLeft: 8
                        }}>
                          {formatEventTime(event)}
                        </span>
                      </div>
                      {event.location && (
                        <div style={{
                          fontSize: 11,
                          color: '#64748b',
                          marginLeft: 20
                        }}>
                          📍 {event.location}
                        </div>
                      )}
                      {event.attendees?.length > 0 && (
                        <div style={{
                          fontSize: 11,
                          color: '#64748b',
                          marginLeft: 20
                        }}>
                          👥 {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}