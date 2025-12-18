// src/hooks/useRenewals.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const useRenewals = (brokerName) => {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [dataSource, setDataSource] = useState('sample');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  const isFetching = useRef(false);

  const loadRenewals = useCallback(async (triggerSync = false) => {
    if (isFetching.current && !triggerSync) return;
    isFetching.current = true;
    setLoading(true);

    try {
      if (triggerSync && !initialSyncDone) {
        await axios.post('/api/sync');
        setInitialSyncDone(true);
      }

      const r = await axios.get('/api/renewals');
      const fetchedItems = r.data.items || [];

      if (fetchedItems.length === 0 && !initialSyncDone && !triggerSync) {
        isFetching.current = false;
        return loadRenewals(true);
      }

      setItems(fetchedItems);
      setDataSource(r.data.source || 'sample');
      if (fetchedItems.length > 0 && !selected) setSelected(fetchedItems[0]);
      setIsConnected(true);

      // Only stop loading if we actually got items, or if we've already tried syncing
      if (fetchedItems.length > 0 || initialSyncDone || triggerSync) {
        setLoading(false);
      }
    } catch (e) {
      setIsConnected(false);
      setLoading(false); // Stop loading on error to show offline screen
      console.error('Failed to load renewals', e);
    } finally {
      isFetching.current = false;
    }
  }, [initialSyncDone, selected]);

  const loadConnectors = useCallback(async () => {
    try {
      const r = await axios.get('/api/connectors');
      setConnectors(r.data.connectors || []);
      setSyncStatus(r.data.syncStatus);
      setIsConnected(true);
    } catch (e) {
      setIsConnected(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      await axios.get('/api/connectors', { timeout: 2000 });
      if (!isConnected) {
        setIsConnected(true);
        loadRenewals();
        loadConnectors();
      }
    } catch (e) {
      setIsConnected(false);
    }
  }, [isConnected, loadRenewals, loadConnectors]);

  // Main background heartbeat - faster when disconnected
  useEffect(() => {
    const interval = setInterval(checkHealth, isConnected ? 8000 : 3000);
    return () => clearInterval(interval);
  }, [checkHealth, isConnected]);

  // Initial load
  useEffect(() => {
    if (brokerName) {
      loadRenewals();
      loadConnectors();
    }
  }, [brokerName, loadRenewals, loadConnectors]);

  // Brief fetcher
  useEffect(() => {
    if (!selected || !isConnected) return;
    setBrief(null);
    axios.get(`/api/renewals/${selected.id}/brief`, {
      params: { brokerName }
    })
      .then(r => {
        setBrief(r.data.brief);
      })
      .catch((e) => {
        setBrief({ error: 'Failed to generate brief' });
        // Don't necessarily drop connection for a single brief failure, 
        // but if it's a network error, checkHealth will catch it.
      });
  }, [selected, brokerName, isConnected]);

  return {
    items,
    selected,
    setSelected,
    brief,
    connectors,
    syncStatus,
    dataSource,
    loading,
    isConnected,
    reload: () => {
      setInitialSyncDone(false);
      loadRenewals();
      loadConnectors();
    }
  };
};