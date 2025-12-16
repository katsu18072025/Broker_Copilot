// frontend/src/components/RenewalDetail.jsx

import React from 'react';
import AIBrief from './AIBrief';
import ActionPanel from './ActionPanel';
import WhatIfSimulator from './WhatIfSimulator';
import QAPanel from './QAPanel';
import CommunicationTimeline from './CommunicationTimeline';

export default function RenewalDetail({ item, brief, computeScore }) {
  if (!item) {
    return (
      <main style={{ flex: 1, padding: 40, textAlign: 'center', color: '#9aa' }}>
        Select a renewal record to view details
      </main>
    );
  }

  const { clientName, policyNumber, carrier, expiryDate, premium, priorityScore, priorityLabel } = item;

  // Determine score color
  const getScoreColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 65) return '#f59e0b';
    if (score >= 45) return '#3b82f6';
    return '#6b7280';
  };

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
            <div>Expiry: <strong>{expiryDate || 'Not set'}</strong></div>
            <div>Premium: <strong>₹{premium?.toLocaleString() || '0'}</strong></div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                Priority Score
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: getScoreColor(priorityScore),
                lineHeight: 1
              }}>
                {priorityScore}
              </div>
              <div style={{
                fontSize: 11,
                color: getScoreColor(priorityScore),
                fontWeight: 600
              }}>
                {priorityLabel || 'Not Rated'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Left: AI Brief (now includes expandable priority breakdown) */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <h4 style={{ margin: '0 0 12px' }}>AI-Generated Brief</h4>
            <div style={{ 
              background: '#041022', 
              padding: 16, 
              borderRadius: 8,
              border: '1px solid #1e293b'
            }}>
              <AIBrief brief={brief} item={item} />
            </div>
          </div>

          {/* Right: Actions + Buttons */}
          <div style={{ width: 320, flexShrink: 0 }}>
            <ActionPanel brief={brief} item={item} />
          </div>
        </div>

        {/* Q&A Panel */}
        <QAPanel item={item} />

        {/* Communication Timeline */}
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