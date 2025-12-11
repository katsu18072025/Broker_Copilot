// frontend/src/components/ActionPanel.jsx - UPDATED with Send Email
import React, { useState } from 'react';
import axios from 'axios';

export default function ActionPanel({ brief, item }) {
  const [sending, setSending] = useState(false);

  const copyTemplate = () => {
    navigator.clipboard.writeText(brief.outreachTemplate || '');
    alert('✅ Outreach email copied to clipboard!');
  };

  const printBrief = () => {
    const win = window.open();
    win.document.write('<pre>' + JSON.stringify({ item: brief }, null, 2) + '</pre>');
    win.print();
  };

  const sendEmail = async () => {
    if (!brief?.outreachTemplate || !item) return;

    const recipient = prompt(
      `Send renewal email to ${item.primaryContactName}?\n\nEnter email address:`,
      `${item.primaryContactName.toLowerCase()}@${item.clientName.toLowerCase().replace(/\s+/g, '')}.com`
    );

    if (!recipient) return;

    setSending(true);
    try {
      // Ensure outreachTemplate is a string
      const template = typeof brief.outreachTemplate === 'string' 
        ? brief.outreachTemplate 
        : JSON.stringify(brief.outreachTemplate);
      
      // Extract subject from template
      const subjectMatch = template.match(/Subject:\s*(.+)/);
      const subject = subjectMatch 
        ? subjectMatch[1].trim() 
        : `${item.clientName} - Renewal Discussion`;
      
      // Remove subject line from body
      const body = template.replace(/Subject:.*?\n\n?/, '');

      const response = await axios.post('/api/send-email', {
        to: recipient,
        subject: subject,
        body: body,
        renewalId: item.id
      });

      if (response.data.success) {
        alert(`✅ Email sent successfully to ${recipient}!\n\nProvider: ${response.data.provider}\nMessage ID: ${response.data.messageId}`);
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
          onClick={sendEmail} 
          disabled={!brief || sending}
          style={{
            padding: '8px 12px',
            background: sending ? '#555' : '#2ecc71',
            border: 'none',
            color: 'white',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: !brief || sending ? 'not-allowed' : 'pointer',
            opacity: !brief || sending ? 0.6 : 1
          }}
        >
          {sending ? '📤 Sending...' : '📧 Send Outreach Email'}
        </button>
        
        <button 
          onClick={copyTemplate} 
          disabled={!brief}
          className="btn"
          style={{
            background: '#3498db',
            border: 'none',
            color: 'white',
            cursor: !brief ? 'not-allowed' : 'pointer',
            opacity: !brief ? 0.6 : 1
          }}
        >
          📋 Copy Template
        </button>
        
        <button 
          onClick={printBrief} 
          disabled={!brief}
          className="btn"
          style={{
            background: '#95a5a6',
            border: 'none',
            color: 'white',
            cursor: !brief ? 'not-allowed' : 'pointer',
            opacity: !brief ? 0.6 : 1
          }}
        >
          🖨️ Print Brief
        </button>
      </div>
    </div>
  );
}