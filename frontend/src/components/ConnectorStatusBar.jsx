// src/components/ConnectorStatusBar.jsx

import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:4000';

export default function ConnectorStatusBar({ connectors, syncStatus, dataSource, onConnectionUpdate }) {
  const [loading, setLoading] = useState(false);
  const [localConnectors, setLocalConnectors] = useState(connectors);

  // Sync local state whenever parent props change
  useEffect(() => {
    setLocalConnectors(connectors);
  }, [connectors]);

  // Detect return from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get('google');

    if (googleStatus === 'connected') {
      alert("✅ Google Data Imported");
      // Clean URL logic to prevent showing it again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleConnect = () => {
    console.log('🔐 Redirecting to Google OAuth...');
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleHubSpotConnect = async () => {
    // 🛡️ DEPENDENCY CHECK: Ensure Google is connected first
    const googleConnector = localConnectors.find(c => c.name.toLowerCase().includes('google'));
    if (googleConnector && googleConnector.status !== 'connected') {
      alert('Please connect Google (Gmail/Calendar) first.\nWe need this to sync your emails and meetings with your deals.');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      console.log('🔗 Testing HubSpot connection...');
      const res = await fetch(`${API_BASE}/auth/test/hubspot`);
      const data = await res.json();

      console.log('✅ HubSpot Response:', data);

      if (data.success) {
        // Optimistic update - immediately show as connected
        setLocalConnectors(prev => prev.map(c =>
          c.name.toLowerCase().includes('hubspot')
            ? { ...c, status: 'connected' }
            : c
        ));

        // 🔄 TRIGGER SYNC AUTOMATICALLY
        try {
          console.log('🔄 Auto-syncing data...');
          await fetch(`${API_BASE}/api/sync`, { method: 'POST' });
        } catch (e) {
          console.error('Sync trigger failed:', e);
        }

        // Notify parent to refresh all data
        if (onConnectionUpdate) {
          setTimeout(() => onConnectionUpdate(), 500);
        }

        alert("✅ HubSpot Data Imported");
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (err) {
      console.error('❌ HubSpot connection error:', err);
      alert(`❌ HubSpot connection failed: ${err.message}`);

      // Revert optimistic update on error
      setLocalConnectors(connectors);
    } finally {
      setLoading(false);
    }
  };

  const getConnectorConfig = (name) => {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('google') || lowerName.includes('gmail')) {
      return {
        handler: handleGoogleConnect,
        btnColor: '#4285f4',
        btnLabel: 'Connect',
        isGoogle: true
      };
    }

    if (lowerName.includes('hubspot')) {
      return {
        handler: handleHubSpotConnect,
        btnColor: '#4285f4',
        btnLabel: 'Connect',
        isHubSpot: true
      };
    }

    return null;
  };

  const getStatusStyle = (status) => ({
    background: status === 'connected' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
    border: `1px solid ${status === 'connected' ? '#2ecc71' : '#e74c3c'}`,
    color: status === 'connected' ? '#2ecc71' : '#e74c3c'
  });

  return (
    <div style={{
      marginBottom: 16,
      padding: 16,
      background: '#071127',
      borderRadius: 8,
      border: '1px solid #1e293b'
    }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

        {localConnectors.map((c, i) => {
          const config = getConnectorConfig(c.name);
          const isConnected = c.status === 'connected';
          const style = getStatusStyle(c.status);
          const isLoadingThis = loading && config?.isHubSpot;

          return (
            <div
              key={i}
              style={{
                ...style,
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.2s ease'
              }}
            >
              {/* Status indicator dot */}
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#2ecc71' : '#e74c3c',
                boxShadow: isConnected ? '0 0 8px #2ecc71' : 'none',
                transition: 'all 0.2s ease'
              }} />

              <span style={{ flex: 1 }}>{c.name}</span>

              {/* Show connect button for disconnected connectors */}
              {!isConnected && config && (
                <button
                  onClick={config.handler}
                  disabled={loading}
                  style={{
                    padding: '4px 12px',
                    background: isLoadingThis ? '#555' : config.btnColor,
                    border: 'none',
                    color: 'white',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isLoadingThis ? 'Testing...' : config.btnLabel}
                </button>
              )}
            </div>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Sync status info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {syncStatus?.lastSync && (
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Last sync: <span style={{ color: '#e2e8f0' }}>
                {new Date(syncStatus.lastSync).toLocaleString()}
              </span>
            </div>
          )}

          <div style={{ fontSize: 11, color: '#64748b' }}>
            {syncStatus?.recordCount || 0} records · Source:{' '}
            <span style={{
              color: dataSource === 'live' ? '#2ecc71' : '#f39c12',
              fontWeight: 600
            }}>
              {dataSource ? dataSource.toUpperCase() : 'SAMPLE'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}