// src/components/ConnectorStatusBar.jsx

import React from 'react';

const API_BASE = 'http://localhost:4000';

export default function ConnectorStatusBar({ connectors, syncStatus, dataSource }) {
  const handleGoogleConnect = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <div style={{ marginBottom: 16, padding: 12, background: '#071127', borderRadius: 8 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Connector badges */}
        {connectors.map((c, i) => (
          <div
            key={i}
            style={{
              padding: '6px 12px',
              background: c.status === 'connected' ? '#1e5631' : '#5c2e2e',
              borderRadius: 6,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{c.status === 'connected' ? 'Connected' : 'Disconnected'}</span>
            {c.name}

            {/* Show Connect button only for disconnected Google connector */}
            {c.status === 'disconnected' && c.name.toLowerCase().includes('google' || 'gmail') && (
              <button
                onClick={handleGoogleConnect}
                style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  background: '#3498db',
                  border: 'none',
                  color: 'white',
                  borderRadius: 3,
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Connect
              </button>
            )}
          </div>
        ))}

        {/* Last sync info */}
        {syncStatus?.lastSync && (
          <div style={{ fontSize: 12, color: '#9aa', marginLeft: 'auto' }}>
            Last sync:{' '}
            {new Date(syncStatus.lastSync).toLocaleString()} ·{' '}
            {syncStatus.recordCount || 0} records
          </div>
        )}

        {/* Optional: show data source indicator */}
        {dataSource && (
          <div style={{ fontSize: 12, color: '#9aa' }}>
            Source: <span style={{ color: dataSource === 'live' ? '#2ecc71' : '#f39c12' }}>
              {dataSource}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}