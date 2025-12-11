// frontend/src/components/CommunicationTimeline.jsx

import React from 'react';

export default function CommunicationTimeline({ item }) {
  if (!item?.communications) {
    return <div style={{ color: '#9aa', fontSize: 13 }}>No communication history available</div>;
  }

  const { communications, primaryContact } = item;
  const { totalTouchpoints, emailCount, meetingCount, lastContactDate, recentEmails, recentMeetings } = communications;

  // Calculate days since last contact
  const daysSinceContact = lastContactDate 
    ? Math.floor((new Date() - new Date(lastContactDate)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div style={{ 
      background: '#041022', 
      padding: 16, 
      borderRadius: 8,
      border: '1px solid #1e293b'
    }}>
      {/* Header with stats */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #1e293b'
      }}>
        <div>
          <h5 style={{ margin: '0 0 4px', fontSize: 14, color: '#e2e8f0' }}>
            Communication History
          </h5>
          {primaryContact?.email && (
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Primary: {primaryContact.name} ({primaryContact.email})
            </div>
          )}
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#3498db' }}>
            {totalTouchpoints}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Total Touchpoints
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 12,
        marginBottom: 16 
      }}>
        <div style={{ 
          padding: 10, 
          background: '#0a1628', 
          borderRadius: 6,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#60a5fa' }}>
            {emailCount}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Emails</div>
        </div>

        <div style={{ 
          padding: 10, 
          background: '#0a1628', 
          borderRadius: 6,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#a78bfa' }}>
            {meetingCount}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Meetings</div>
        </div>

        <div style={{ 
          padding: 10, 
          background: '#0a1628', 
          borderRadius: 6,
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            color: daysSinceContact > 30 ? '#ef4444' : daysSinceContact > 14 ? '#f59e0b' : '#10b981'
          }}>
            {daysSinceContact !== null ? `${daysSinceContact}d` : 'N/A'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Since Last Contact</div>
        </div>
      </div>

      {/* Recent emails */}
      {recentEmails && recentEmails.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            color: '#94a3b8', 
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Recent Emails
          </div>
          {recentEmails.map((email, i) => (
            <div 
              key={i}
              style={{
                padding: '8px 10px',
                background: '#0a1628',
                borderRadius: 4,
                marginBottom: 6,
                fontSize: 12
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: 2
              }}>
                <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                  📧 {email.subject || 'No subject'}
                </span>
                <span style={{ color: '#64748b', fontSize: 11 }}>
                  {email.date}
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: 11 }}>
                From: {email.from}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent meetings */}
      {recentMeetings && recentMeetings.length > 0 && (
        <div>
          <div style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            color: '#94a3b8', 
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Recent Meetings
          </div>
          {recentMeetings.map((meeting, i) => (
            <div 
              key={i}
              style={{
                padding: '8px 10px',
                background: '#0a1628',
                borderRadius: 4,
                marginBottom: 6,
                fontSize: 12
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between'
              }}>
                <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
                  📅 {meeting.summary || 'No title'}
                </span>
                <span style={{ color: '#64748b', fontSize: 11 }}>
                  {new Date(meeting.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No activity warning */}
      {totalTouchpoints === 0 && (
        <div style={{
          padding: 12,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 6,
          color: '#fca5a5',
          fontSize: 13,
          textAlign: 'center'
        }}>
          ⚠️ No communication history found. Consider reaching out soon.
        </div>
      )}
    </div>
  );
}