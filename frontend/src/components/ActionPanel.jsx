// frontend/src/components/ActionPanel.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MeetingScheduler from './MeetingScheduler';

export default function ActionPanel({ brief, item }) {
  const [sending, setSending] = useState(false);
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    if (brief?.outreachTemplate && item) {
      const template = typeof brief.outreachTemplate === 'string' 
        ? brief.outreachTemplate 
        : JSON.stringify(brief.outreachTemplate);
      
      const subjectMatch = template.match(/Subject:\s*(.+)/);
      const subject = subjectMatch 
        ? subjectMatch[1].trim() 
        : `${item.clientName} - Renewal Discussion`;
      
      const body = template.replace(/Subject:.*?\n\n?/, '');

      setEditableSubject(subject);
      setEditableBody(body);

      if (item.primaryContact?.email) {
        setRecipientEmail(item.primaryContact.email);
      } else {
        setRecipientEmail(`${item.primaryContactName?.toLowerCase()}@${item.clientName.toLowerCase().replace(/\s+/g, '')}.com`);
      }
    }
  }, [brief, item]);

  const copyTemplate = () => {
    const fullTemplate = `Subject: ${editableSubject}\n\n${editableBody}`;
    navigator.clipboard.writeText(fullTemplate);
    alert('✅ Outreach email copied to clipboard!');
  };

  const printBrief = () => {
    const win = window.open();
    win.document.write('<pre>' + JSON.stringify({ item: brief }, null, 2) + '</pre>');
    win.print();
  };

  const sendEmail = async () => {
    if (!editableSubject || !editableBody || !recipientEmail) {
      alert('❌ Please fill in all fields (recipient, subject, and body)');
      return;
    }

    setSending(true);
    try {
      const htmlBody = editableBody
        .split('\n\n')
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');

      const response = await axios.post('/api/send-email', {
        to: recipientEmail,
        subject: editableSubject,
        body: editableBody,
        htmlBody: htmlBody,
        renewalId: item.id
      });

      if (response.data.success) {
        alert(`✅ Email sent successfully to ${recipientEmail}!`);
        setShowEmailEditor(false);
      } else {
        throw new Error(response.data.error || 'Failed to send');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      const needsAuth = err.response?.data?.needsAuth;
      
      if (needsAuth) {
        const connect = confirm(`❌ Google not connected!\n\n${errorMsg}\n\nConnect Google now?`);
        if (connect) {
          window.location.href = 'http://localhost:4000/auth/google';
        }
      } else {
        alert(`❌ Failed to send email: ${errorMsg}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ width: 300 }}>
      <h4 style={{ margin: '0 0 8px' }}>Recommended Actions</h4>
      {brief?.keyActions ? (
        <ol style={{ paddingLeft: 20, margin: '0 0 12px' }}>
          {brief.keyActions.map((a, i) => (
            <li key={i} style={{ marginBottom: 6, fontSize: 13 }}>{a}</li>
          ))}
        </ol>
      ) : (
        <div style={{ color: '#9aa', marginBottom: 12 }}>Loading actions...</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button 
          onClick={() => setShowEmailEditor(true)} 
          disabled={!brief}
          style={{
            padding: '8px 12px',
            background: !brief ? '#555' : '#2ecc71',
            border: 'none',
            color: 'white',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: !brief ? 'not-allowed' : 'pointer',
            opacity: !brief ? 0.6 : 1
          }}
        >
          📧 Compose & Send Email
        </button>

        <button 
          onClick={() => setShowMeetingScheduler(true)} 
          disabled={!item}
          style={{
            padding: '8px 12px',
            background: !item ? '#555' : '#3b82f6',
            border: 'none',
            color: 'white',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: !item ? 'not-allowed' : 'pointer',
            opacity: !item ? 0.6 : 1
          }}
        >
          📅 Schedule Meeting
        </button>
        
        <button 
          onClick={copyTemplate} 
          disabled={!brief}
          style={{
            padding: '8px 12px',
            background: '#3498db',
            border: 'none',
            color: 'white',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: !brief ? 'not-allowed' : 'pointer',
            opacity: !brief ? 0.6 : 1
          }}
        >
          📋 Copy Template
        </button>
        
        <button 
          onClick={printBrief} 
          disabled={!brief}
          style={{
            padding: '8px 12px',
            background: '#95a5a6',
            border: 'none',
            color: 'white',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: !brief ? 'not-allowed' : 'pointer',
            opacity: !brief ? 0.6 : 1
          }}
        >
          🖨️ Print Brief
        </button>
      </div>

      {/* Email Editor Modal */}
      {showEmailEditor && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#071127',
            padding: 24,
            borderRadius: 12,
            width: '100%',
            maxWidth: 700,
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #1e293b'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20 
            }}>
              <h3 style={{ margin: 0, color: '#e2e8f0' }}>Compose Outreach Email</h3>
              <button 
                onClick={() => setShowEmailEditor(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 6, 
                fontSize: 13, 
                color: '#94a3b8',
                fontWeight: 600 
              }}>
                To:
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a1628',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  color: '#e2e8f0',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 6, 
                fontSize: 13, 
                color: '#94a3b8',
                fontWeight: 600 
              }}>
                Subject:
              </label>
              <input
                type="text"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                placeholder="Email subject"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0a1628',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  color: '#e2e8f0',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 6, 
                fontSize: 13, 
                color: '#94a3b8',
                fontWeight: 600 
              }}>
                Message:
              </label>
              <textarea
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                placeholder="Email body"
                rows={12}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0a1628',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  color: '#e2e8f0',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: 12, 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowEmailEditor(false)}
                style={{
                  padding: '10px 20px',
                  background: '#334155',
                  border: 'none',
                  color: '#e2e8f0',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={sending}
                style={{
                  padding: '10px 24px',
                  background: sending ? '#555' : '#2ecc71',
                  border: 'none',
                  color: 'white',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.6 : 1
                }}
              >
                {sending ? '📤 Sending...' : '📧 Send Email'}
              </button>
            </div>

            {brief?._aiGenerated && (
              <div style={{
                marginTop: 16,
                padding: 10,
                background: 'rgba(52, 152, 219, 0.1)',
                border: '1px solid rgba(52, 152, 219, 0.3)',
                borderRadius: 6,
                fontSize: 12,
                color: '#60a5fa',
                textAlign: 'center'
              }}>
                ✨ This email was AI-generated. Review and edit as needed before sending.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meeting Scheduler Modal */}
      {showMeetingScheduler && (
        <MeetingScheduler 
          item={item} 
          onClose={() => setShowMeetingScheduler(false)} 
        />
      )}
    </div>
  );
}