import React, { useState } from 'react';

export default function ActionPanel({ brief }) {
  const copyTemplate = () => {
    navigator.clipboard.writeText(brief.outreachTemplate || '');
    alert('Outreach email copied!');
  };

  const printBrief = () => {
    const win = window.open();
    win.document.write('<pre>' + JSON.stringify({ item: brief }, null, 2) + '</pre>');
    win.print();
  };

  return (
    <div style={{ width: 300 }}>
      <h4 style={{ margin: '0 0 8px' }}>Recommended Actions</h4>
      {brief?.keyActions ? (
        <ol style={{ paddingLeft: 20 }}>
          {brief.keyActions.map((a, i) => <li key={i} style={{ marginBottom: 6 }}>{a}</li>)}
        </ol>
      ) : (
        <div style={{ color: '#9aa' }}>Loading...</div>
      )}

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copyTemplate} disabled={!brief} className="btn">Copy Outreach</button>
        <button onClick={printBrief} disabled={!brief} className="btn">Print Brief</button>
      </div>
    </div>
  );
}