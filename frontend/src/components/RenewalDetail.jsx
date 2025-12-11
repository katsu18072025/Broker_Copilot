import React from 'react';
import AIBrief from './AIBrief';
import ActionPanel from './ActionPanel';
import WhatIfSimulator from './WhatIfSimulator';
import QAPanel from './QAPanel'; // ADD THIS IMPORT

export default function RenewalDetail({ item, brief, computeScore }) {
  if (!item) {
    return (
      <main style={{ flex: 1, padding: 40, textAlign: 'center', color: '#9aa' }}>
        Select a renewal record to view details
      </main>
    );
  }

  const { clientName, policyNumber, carrier, expiryDate, premium, priorityScore } = item;

  return (
    <main style={{ flex: 1 }}>
      <div style={{ background: '#071127', padding: 16, borderRadius: 8 }}>
        {/* Header: Client + Key Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22 }}>{clientName}</h3>
            <div style={{ fontSize: 13, color: '#9aa' }}>
              {policyNumber} · {carrier}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 14 }}>
            <div>Expiry: <strong>{expiryDate}</strong></div>
            <div>Premium: <strong>₹{premium.toLocaleString()}</strong></div>
            <div>
              Priority Score:{' '}
              <strong style={{
                color: priorityScore >= 70 ? '#e74c3c' : priorityScore >= 50 ? '#f39c12' : '#95a5a6',
                fontSize: 18
              }}>
                {priorityScore}
              </strong>
            </div>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Left: AI Brief */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <h4 style={{ margin: '0 0 12px' }}>AI-Generated Brief</h4>
            <AIBrief brief={brief} />
          </div>

          {/* Right: Actions + Buttons */}
          <div style={{ width: 320, flexShrink: 0 }}>
            <ActionPanel brief={brief} item={item} />
          </div>
        </div>

        {/* Q&A Panel - NEW */}
        <QAPanel item={item} />

        {/* Communication Timeline - NEW */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 12px' }}>Communication History</h4>
          <CommunicationTimeline item={item} />
        </div>

        {/* Bottom: What-If Simulator */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 12px' }}>What-if Priority Simulator</h4>
          <WhatIfSimulator item={item} compute={computeScore} />
        </div>
      </div>
    </main>
  );
}