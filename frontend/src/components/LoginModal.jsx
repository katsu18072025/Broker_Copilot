import React, { useState } from 'react';

export default function LoginModal({onSave, onClose}){
  const [name,setName]=useState('');
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000}}>
      <div style={{background:'#071127', padding:20, borderRadius:8, minWidth: 300}}>
        <h4 style={{marginTop: 0}}>Enter broker name</h4>
        <input 
          value={name} 
          onChange={e=>setName(e.target.value)} 
          placeholder="Your name"
          style={{padding:8, marginTop:8, width:'100%', boxSizing:'border-box'}} 
          onKeyPress={e => e.key === 'Enter' && onSave(name||'Broker')}
        />
        <div style={{marginTop:12, display:'flex', gap: 8, justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding: '8px 16px', background: '#555', border: 'none', color: 'white', borderRadius: 4, cursor: 'pointer'}}>Cancel</button>
          <button onClick={()=>onSave(name||'Broker')} className='btn'>Save</button>
        </div>
      </div>
    </div>
  );
}