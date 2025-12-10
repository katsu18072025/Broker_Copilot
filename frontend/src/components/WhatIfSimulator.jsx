import React, { useState } from 'react';

export default function WhatIfSimulator({item, compute}){
  const [premium,setPremium]=useState(item.premium);
  const [touch,setTouch]=useState(item.recentTouchpoints||0);
  const [days,setDays]=useState(item._scoreBreakdown?.daysToExpiry||30);
  const simItem={...item, premium, recentTouchpoints:touch, expiryDate: new Date(Date.now()+days*24*60*60*1000).toISOString().split('T')[0]};
  const result=compute(simItem);
  
  return (
    <div style={{background:'#041022', padding:10, borderRadius:6}}>
      <div style={{marginBottom: 8}}>Premium: ₹{premium.toLocaleString()}</div>
      <input type='range' min='50000' max='2000000' value={premium} onChange={e=>setPremium(Number(e.target.value))} style={{width:'100%'}} />
      
      <div style={{marginTop:10, marginBottom: 8}}>Touchpoints: {touch}</div>
      <input type='range' min='0' max='10' value={touch} onChange={e=>setTouch(Number(e.target.value))} style={{width:'100%'}} />
      
      <div style={{marginTop:10, marginBottom: 8}}>Days to expiry: {days}</div>
      <input type='range' min='1' max='365' value={days} onChange={e=>setDays(Number(e.target.value))} style={{width:'100%'}} />
      
      <div style={{marginTop:12, padding: 8, background:'#0a1628', borderRadius: 4}}>
        Simulated score: <b style={{fontSize: 18, color: result.value >= 70 ? '#e74c3c' : result.value >= 50 ? '#f39c12' : '#95a5a6'}}>{result.value}</b>
      </div>
    </div>
  );
}