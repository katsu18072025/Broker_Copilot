// src/hooks/useRenewals.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useRenewals = () => {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [dataSource, setDataSource] = useState('sample');
  const [loading, setLoading] = useState(true);

  const loadRenewals = async () => {
    try {
      const r = await axios.get('/api/renewals');
      setItems(r.data.items || []);
      setDataSource(r.data.source || 'sample');
      if (r.data.items?.length) setSelected(r.data.items[0]);
    } catch (e) {
      alert('Failed to load backend. Is it running on port 4000?');
    } finally {
      setLoading(false);
    }
  };

  const loadConnectors = async () => {
    try {
      const r = await axios.get('/api/connectors');
      setConnectors(r.data.connectors || []);
      setSyncStatus(r.data.syncStatus);
    } catch (e) {}
  };

  useEffect(() => {
    loadRenewals();
    loadConnectors();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setBrief(null);
    axios.get(`/api/renewals/${selected.id}/brief`)
      .then(r => setBrief(r.data.brief))
      .catch(() => setBrief({ error: 'Failed to generate brief' }));
  }, [selected]);

  return {
    items,
    selected,
    setSelected,
    brief,
    connectors,
    syncStatus,
    dataSource,
    loading,
    reload: () => { loadRenewals(); loadConnectors(); }
  };
};