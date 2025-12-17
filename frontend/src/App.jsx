// src/App.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useRenewals } from './hooks/useRenewals';
import { computeScore } from './utils/scoreCalculator'; // Keep for potential client-side recalculations

import Header from './components/Header';
import ConnectorStatusBar from './components/ConnectorStatusBar';
import UpcomingEventsPanel from './components/UpcomingEventsPanel';
import RenewalPipeline from './components/RenewalPipeline';
import RenewalDetail from './components/RenewalDetail';
import LoginModal from './components/LoginModal';

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
    reload
  } = useRenewals();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await axios.post('/api/sync');
      alert(data.success ? `Synced ${data.renewalCount} records!` : data.error);
      reload();
    } catch (e) {
      alert('Sync failed');
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
    <div style={{ padding: 20, background: '#0a0e1a', minHeight: '100vh', color: '#e0e6ed' }}>
      <Header broker={broker} onLoginClick={() => setShowLogin(true)} onSync={handleSync} syncing={syncing} />

      <ConnectorStatusBar 
        connectors={connectors} 
        syncStatus={syncStatus} 
        dataSource={dataSource}
        onConnectionUpdate={reload}
      />

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        {/* Left sidebar with Upcoming Events and Pipeline */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <UpcomingEventsPanel />
          <RenewalPipeline items={items} selected={selected} onSelect={setSelected} />
        </div>

        {/* Main content area */}
        <RenewalDetail item={selected} brief={brief} computeScore={computeScore} />
      </div>

      {showLogin && <LoginModal onSave={saveBroker} onClose={() => setShowLogin(false)} />}
    </div>
  );
}