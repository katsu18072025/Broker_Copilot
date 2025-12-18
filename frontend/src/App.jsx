// src/App.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useRenewals } from './hooks/useRenewals';
import { computeScore } from './utils/scoreCalculator';

import Header from './components/Header';
import UpcomingEventsPanel from './components/UpcomingEventsPanel';
import RenewalPipeline from './components/RenewalPipeline';
import RenewalDetail from './components/RenewalDetail';
import LoginModal from './components/LoginModal';
import ConnectionGuard from './components/ConnectionGuard';
import LoadingOverlay from './components/LoadingOverlay';

const API_BASE = 'http://localhost:4000';
axios.defaults.baseURL = API_BASE;

export default function App() {
  const [broker, setBroker] = useState(localStorage.getItem('broker') || '');
  const [showLogin, setShowLogin] = useState(!broker);
  const [syncing, setSyncing] = useState(false);

  const {
    items,
    selected,
    setSelected,
    brief,
    connectors,
    syncStatus,
    dataSource,
    loading,
    isConnected,
    reload
  } = useRenewals(broker);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.post('/api/sync');
      reload();
    } catch (e) {
      console.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const saveBroker = (name) => {
    const finalName = name.trim() || 'Broker';
    localStorage.setItem('broker', finalName);
    setBroker(finalName);
    setShowLogin(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100vw', padding: '0 24px 40px', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <LoadingOverlay isLoading={loading || syncing} isDisconnected={!isConnected} onRetry={reload} />

      <Header
        broker={broker}
        onLoginClick={() => setShowLogin(true)}
        onSync={handleSync}
        syncing={syncing}
        connectors={connectors}
        syncStatus={syncStatus}
        dataSource={dataSource}
      />

      <ConnectionGuard connectors={connectors} onConnectionUpdate={reload} isConnected={isConnected}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', minWidth: 0, marginTop: 16 }}>
          {/* Left sidebar - narrowed and sticky for persistent navigation */}
          <aside style={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            gap: 16,
            position: 'sticky',
            top: 16,
            maxHeight: 'calc(100vh - 80px)', // Account for header and bottom padding
            alignSelf: 'flex-start'
          }}>
            <UpcomingEventsPanel />
            <RenewalPipeline items={items} selected={selected} onSelect={setSelected} onRefresh={reload} />
          </aside>

          {/* Main content area - fluid to fill screen; sidebars anchored left/right */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <RenewalDetail item={selected} brief={brief} computeScore={computeScore} />
          </div>
        </div>
      </ConnectionGuard>

      {showLogin && <LoginModal onSave={saveBroker} onClose={() => setShowLogin(false)} />}
    </div>
  );
}