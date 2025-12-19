import React, { useState, useEffect } from 'react';

import Hubspot from '../assets/Hubspot';
import Google from '../assets/Google';


export default function ConnectorStatusBar({ connectors, syncStatus, dataSource, onConnectionUpdate }) {
  const [loading, setLoading] = useState(false);
  const [localConnectors, setLocalConnectors] = useState(connectors);

  useEffect(() => {
    setLocalConnectors(connectors);
  }, [connectors]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleConnect = () => {
    window.location.href = `/auth/google`;
  };

  const handleHubSpotConnect = async () => {
    const googleConnector = localConnectors.find(c => c.name.toLowerCase().includes('google'));
    if (googleConnector && googleConnector.status !== 'connected') {
      alert('Connect Google first to enable cross-sync.');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/auth/test/hubspot`);
      const data = await res.json();
      if (data.success) {
        setLocalConnectors(prev => prev.map(c => c.name.toLowerCase().includes('hubspot') ? { ...c, status: 'connected' } : c));
        await fetch(`/api/sync`, { method: 'POST' });
        if (onConnectionUpdate) setTimeout(() => onConnectionUpdate(), 500);
      } else throw new Error(data.error);
    } catch (err) {
      alert(`Connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getConnectorConfig = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('google')) return { handler: handleGoogleConnect, label: 'Google Suite', icon: <Google size={18} /> };
    if (lower.includes('hubspot')) return { handler: handleHubSpotConnect, label: 'HubSpot CRM', icon: <Hubspot size={16} /> };
    return null;
  };

  return (
    <div className="glass-card" style={{ marginBottom: 24, padding: '12px 20px' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {localConnectors.map((c, i) => {
            const config = getConnectorConfig(c.name);
            const isConnected = c.status === 'connected';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {config?.icon}
                <span style={{ fontSize: 13, fontWeight: 600, color: isConnected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{config?.label}</span>
                {isConnected ? (
                  <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>
                ) : (
                  <button onClick={config?.handler} className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10, borderRadius: 4, cursor: 'pointer' }}>CONNECT</button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {syncStatus?.lastSync && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Latest Sync: <strong style={{ color: 'var(--text-primary)' }}>{new Date(syncStatus.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Source: <span style={{ color: dataSource === 'live' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>{dataSource?.toUpperCase() || 'DEMO'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}