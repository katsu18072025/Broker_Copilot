import React from 'react';

export default function Header({ broker, onLoginClick, onSync, syncing }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div>
        <h2 style={{ margin: 0 }}>Broker Renewal Copilot</h2>
        <div style={{ fontSize: 12, color: '#9aa' }}>
          Connector-driven demo · Data: <span style={{ color: '#2ecc71' }}>live</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {broker ? (
          <div style={{ fontSize: 13 }}>Prepared by <b>{broker}</b></div>
        ) : (
          <button onClick={onLoginClick} className='btn'>Sign in</button>
        )}
        <button onClick={onSync} disabled={syncing} className="btn">
          {syncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>
    </header>
  );
}