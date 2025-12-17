import React, { useState, useEffect, useMemo } from 'react';

export default function WhatIfSimulator({ item, compute }) {

  /* ------------------ STATE ------------------ */
  const [expiryDays, setExpiryDays] = useState(30);
  const [premium, setPremium] = useState(500000);
  const [touchpoints, setTouchpoints] = useState(0);
  const [dealStage, setDealStage] = useState('Discovery');

  /* ------------------ SYNC STATE WITH ITEM ------------------ */
  useEffect(() => {
    if (!item) return;

    // Expiry days calculation
    if (item.expiryDate) {
      const today = new Date();
      const expiry = new Date(item.expiryDate);
      setExpiryDays(
        Math.max(
          0,
          Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
        )
      );
    } else {
      setExpiryDays(30);
    }

    setPremium(item.premium || 500000);
    setTouchpoints(item.communications?.totalTouchpoints || 0);
    setDealStage(item.status || 'Discovery');

  }, [item]);

  /* ------------------ HELPERS ------------------ */
  const simulateExpiryDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const formatNumber = (num) => {
    if (num >= 10000000) return '₹' + (num / 10000000).toFixed(1) + 'Cr';
    if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return '₹' + (num / 1000).toFixed(0) + 'K';
    return '₹' + num.toLocaleString();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 65) return '#f59e0b';
    if (score >= 45) return '#3b82f6';
    return '#6b7280';
  };

  /* ------------------ SIMULATED ITEM ------------------ */
  const simItem = useMemo(() => ({
    ...item,
    expiryDate: simulateExpiryDate(expiryDays),
    premium: premium,
    coveragePremium: premium,
    status: dealStage,
    communications: {
      ...item?.communications,
      totalTouchpoints: touchpoints,
      emailCount: Math.floor(touchpoints * 0.6),
      meetingCount: Math.floor(touchpoints * 0.4),
    }
  }), [item, expiryDays, premium, touchpoints, dealStage]);

  const result = useMemo(() => compute(simItem), [compute, simItem]);

  const dealStages = [
    'Discovery',
    'Pre-Renewal Review',
    'Pricing Discussion',
    'Quote Comparison',
    'Renewed'
  ];

  /* ------------------ UI ------------------ */
  return (
    <div style={{
      background: '#041022',
      padding: 16,
      borderRadius: 8,
      border: '1px solid #1e293b'
    }}>

      <div style={{
        marginBottom: 16,
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 1.6
      }}>
        💡 Adjust the sliders below to see how different factors affect the priority score.
      </div>

      {/* Days to Expiry */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#e2e8f0' }}>
          <span>⏰ Days Until Expiry</span>
          <span style={{ fontWeight: 'bold' }}>{expiryDays} days</span>
        </div>
        <input
          type="range"
          min="0"
          max="120"
          value={expiryDays}
          onChange={e => setExpiryDays(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Premium */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#e2e8f0' }}>
          <span>💰 Premium Amount</span>
          <span style={{ fontWeight: 'bold', color: '#10b981' }}>{formatNumber(premium)}</span>
        </div>
        <input
          type="range"
          min="50000"
          max="10000000"
          step="50000"
          value={premium}
          onChange={e => setPremium(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Touchpoints */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#e2e8f0' }}>
          <span>💬 Communication Touchpoints</span>
          <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>{touchpoints}</span>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          value={touchpoints}
          onChange={e => setTouchpoints(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Deal Stage */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 6, fontSize: 13, color: '#e2e8f0' }}>
          📊 Deal Stage
        </div>
        <select
          value={dealStage}
          onChange={e => setDealStage(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#0a1628',
            border: '1px solid #1e293b',
            borderRadius: 4,
            color: '#e2e8f0'
          }}
        >
          {dealStages.map(stage => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </div>

      {/* Score */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: '#0a1628',
        borderRadius: 6,
        border: '2px solid #1e293b'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Simulated Priority Score</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: getScoreColor(result.value) }}>
            {result.value.toFixed(1)}
          </div>
        </div>

        {result.breakdown && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#64748b' }}>
            <div>Time Urgency: {result.breakdown.timeUrgency}</div>
            <div>Deal Value: {result.breakdown.dealValue}</div>
            <div>Engagement: {result.breakdown.engagement}</div>
            <div>Deal Stage: {result.breakdown.dealStage}</div>
            <div>Contact Quality: {result.breakdown.contactQuality}</div>
          </div>
        )}
      </div>
    </div>
  );
}
