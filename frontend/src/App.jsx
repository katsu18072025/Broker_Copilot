// src/App.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useRenewals } from './hooks/useRenewals';
import { computeScore } from './utils/scoreCalculator';

import Header from './components/Header';
import ConnectorStatusBar from './components/ConnectorStatusBar';
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

      <ConnectorStatusBar connectors={connectors} syncStatus={syncStatus} dataSource={dataSource} />

      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <RenewalPipeline items={items} selected={selected} onSelect={setSelected} />
        <RenewalDetail item={selected} brief={brief} computeScore={computeScore} />
      </div>

      {showLogin && <LoginModal onSave={saveBroker} onClose={() => setShowLogin(false)} />}
    </div>
  );
}