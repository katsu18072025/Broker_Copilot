import React, { useState } from 'react';

export default function WhatIfSimulator({ item, compute }) {
  const [totalPremium, setTotalPremium] = useState(item.totalPremium || 0);
  const [coveragePremiumAmount, setCoveragePremiumAmount] = useState(item.coveragePremiumAmount || 0);
  const [comissionAmount, setComissionAmount] = useState(item.comissionAmount || 0);
  const [limit, setLimit] = useState(item.limit || 0);
  const [comissionPercent, setComissionPercent] = useState(item.comissionPercent || 1); // Min 1 as per analysis

  // Create a simulated item object with the current slider values
  const simItem = {
    ...item,
    totalPremium: totalPremium,
    coveragePremiumAmount: coveragePremiumAmount,
    comissionAmount: comissionAmount,
    limit: limit,
    comissionPercent: comissionPercent,
  };

  const result = compute(simItem);

  // Helper function to format large numbers (e.g., for premium and limit)
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div style={{ background: '#041022', padding: 10, borderRadius: 6 }}>
      <div style={{ marginBottom: 8 }}>Total Premium: ₹{formatNumber(totalPremium)}</div>
      <input type='range' min='0' max='10166660' value={totalPremium} onChange={e => setTotalPremium(Number(e.target.value))} style={{ width: '100%' }} />

      <div style={{ marginTop: 10, marginBottom: 8 }}>Coverage Premium Amount: ₹{formatNumber(coveragePremiumAmount)}</div>
      <input type='range' min='0' max='9497513' value={coveragePremiumAmount} onChange={e => setCoveragePremiumAmount(Number(e.target.value))} style={{ width: '100%' }} />

      <div style={{ marginTop: 10, marginBottom: 8 }}>Comission Amount: ₹{formatNumber(comissionAmount)}</div>
      <input type='range' min='0' max='1595200' value={comissionAmount} onChange={e => setComissionAmount(Number(e.target.value))} style={{ width: '100%' }} />

      <div style={{ marginTop: 10, marginBottom: 8 }}>Limit: ₹{formatNumber(limit)}</div>
      <input type='range' min='0' max='385732800' value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: '100%' }} />

      <div style={{ marginTop: 10, marginBottom: 8 }}>Comission %: {comissionPercent}%</div>
      <input type='range' min='1' max='20' value={comissionPercent} onChange={e => setComissionPercent(Number(e.target.value))} style={{ width: '100%' }} />

      <div style={{ marginTop: 12, padding: 8, background: '#0a1628', borderRadius: 4 }}>
        Simulated score: <b style={{ fontSize: 18, color: result.value >= 0.7 ? '#e74c3c' : result.value >= 0.5 ? '#f39c12' : '#95a5a6' }}>{result.value.toFixed(4)}</b>
      </div>
    </div>
  );
}