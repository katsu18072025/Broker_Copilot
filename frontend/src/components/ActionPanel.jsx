// frontend/src/components/ActionPanel.jsx
import React, { useState } from 'react';
import OutreachModal from './OutreachModal';
import MeetingScheduler from './MeetingScheduler';

export default function ActionPanel({ brief, item }) {
  const [showEmailEditor, setShowEmailEditor] = useState(false);
  const [showMeetingScheduler, setShowMeetingScheduler] = useState(false);

  const copyTemplate = () => {
    if (!brief?.outreachTemplate) return;
    const template = typeof brief.outreachTemplate === 'string'
      ? brief.outreachTemplate
      : JSON.stringify(brief.outreachTemplate);

    // Attempt to extract body if Subject exists
    const cleanTemplate = template.includes('Subject:')
      ? template
      : `Subject: ${item.clientName} - Renewal Discussion\n\n${template}`;

    navigator.clipboard.writeText(cleanTemplate);
    alert('Outreach email copied to clipboard!');
  };

  const printBrief = () => {
    if (!item?.id) return;
    const url = `/api/renewals/${item.id}/pdf`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.clientName}_brief.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-card" style={{ padding: 16 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Recommended Actions</h4>

      {brief?.keyActions ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {brief.keyActions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{i + 1}.</span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 16 }}>Formulating plan...</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => brief && setShowEmailEditor(true)}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', height: 40 }}
          disabled={!brief}
        >
          Send Outreach
        </button>

        <button
          onClick={() => setShowMeetingScheduler(true)}
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', height: 40 }}
          disabled={!item}
        >
          Schedule Meeting
        </button>

        <div style={{ height: 1, background: 'var(--border-color)', margin: '2px 0' }}></div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={copyTemplate}
            className="btn btn-secondary"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '8px 4px' }}
            disabled={!brief}
          >
            Copy Text
          </button>

          <button
            onClick={printBrief}
            className="btn btn-secondary"
            style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '8px 4px' }}
            disabled={!brief}
          >
            PDF Report
          </button>
        </div>
      </div>

      {showEmailEditor && (
        <OutreachModal
          item={item}
          brief={brief}
          onClose={() => setShowEmailEditor(false)}
        />
      )}

      {showMeetingScheduler && <MeetingScheduler item={item} onClose={() => setShowMeetingScheduler(false)} />}
    </div>
  );
}