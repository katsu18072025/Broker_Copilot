// frontend/src/components/RenewalPipeline.jsx
import React, { useState } from 'react';

export default function RenewalPipeline({ items, selected, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState({});

  const toggleDetails = (itemId) => {
    setDetailsExpanded(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  if (collapsed) {
    return (
      <div style={{
        width: 320,
        background: '#071127',
        padding: 12,
        borderRadius: 8,
        border: '1px solid #1e293b'
      }}>
        <div
          onClick={() => setCollapsed(false)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <h4 style={{ margin: 0, fontSize: 14 }}>Pipeline</h4>
            <span style={{
              background: '#3b82f6',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 'bold'
            }}>
              {items.length}
            </span>
          </div>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: 18,
            cursor: 'pointer',
            padding: 0
          }}>
            ▼
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside style={{
      width: 320,
      background: '#071127',
      padding: 10,
      borderRadius: 8,
      border: '1px solid #1e293b',
      maxHeight: 'calc(100vh - 250px)',
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        position: 'sticky',
        top: 0,
        background: '#071127',
        padding: '8px 0',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <h4 style={{ margin: 0 }}>Pipeline ({items.length})</h4>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const allExpanded = Object.keys(detailsExpanded).length === items.length 
                && Object.values(detailsExpanded).every(v => v);
              
              const newState = {};
              items.forEach(item => {
                newState[item.id] = !allExpanded;
              });
              setDetailsExpanded(newState);
            }}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              color: '#94a3b8',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Expand/Collapse All"
          >
            {Object.values(detailsExpanded).some(v => v) ? '▲ All' : '▼ All'}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
              padding: 0
            }}
            title="Collapse Panel"
          >
            ▲
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: '#9aa' }}>
          No renewals. Click "Sync Data" to load.
        </div>
      ) : (
        items.map(item => {
          const isExpanded = detailsExpanded[item.id];
          const isSelected = selected?.id === item.id;

          return (
            <div
              key={item.id}
              style={{
                padding: 8,
                border: isSelected ? '1px solid #2ecc71' : '1px solid #1e293b',
                marginTop: 8,
                borderRadius: 6,
                background: isSelected ? '#041a14' : '#041022',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Header - Always Visible */}
              <div
                onClick={() => onSelect(item)}
                style={{ marginBottom: isExpanded ? 8 : 0 }}
              >
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>
                  {item.clientName}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {item.productLine}
                </div>
              </div>

              {/* Priority Score Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: item.priorityScore >= 70 ? '#ef444415' : '#f59e0b15',
                  border: `1px solid ${item.priorityScore >= 70 ? '#ef4444' : '#f59e0b'}`,
                  padding: '3px 8px',
                  borderRadius: 4
                }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Priority:</span>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: 13,
                    color: item.priorityScore >= 70 ? '#ef4444' : '#f59e0b'
                  }}>
                    {item.priorityScore}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDetails(item.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {isExpanded ? '▲ Less' : '▼ More'}
                </button>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid #1e293b',
                  fontSize: 12,
                  color: '#cbd5e1',
                  lineHeight: 1.6,
                  animation: 'slideDown 0.2s ease-out'
                }}>
                  <style>
                    {`
                      @keyframes slideDown {
                        from {
                          opacity: 0;
                          max-height: 0;
                          transform: translateY(-5px);
                        }
                        to {
                          opacity: 1;
                          max-height: 500px;
                          transform: translateY(0);
                        }
                      }
                    `}
                  </style>
                  
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Policy:</span>{' '}
                    <span style={{ color: '#e2e8f0' }}>{item.policyNumber}</span>
                  </div>
                  
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Carrier:</span>{' '}
                    <span style={{ color: '#e2e8f0' }}>{item.carrier}</span>
                  </div>
                  
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Expiry:</span>{' '}
                    <span style={{ color: '#e2e8f0' }}>{item.expiryDate || 'Not set'}</span>
                  </div>
                  
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Premium:</span>{' '}
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      ₹{item.premium?.toLocaleString() || '0'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Stage:</span>{' '}
                    <span style={{ color: '#e2e8f0' }}>{item.status}</span>
                  </div>

                  {item.communications && (
                    <div style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid #1e293b'
                    }}>
                      <div style={{ color: '#64748b', marginBottom: 4, fontSize: 11 }}>
                        Communications
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div>
                          <span style={{ color: '#60a5fa' }}>
                            {item.communications.emailCount || 0}
                          </span>
                          <span style={{ color: '#64748b', fontSize: 11 }}> emails</span>
                        </div>
                        <div>
                          <span style={{ color: '#a78bfa' }}>
                            {item.communications.meetingCount || 0}
                          </span>
                          <span style={{ color: '#64748b', fontSize: 11 }}> meetings</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {item.primaryContact?.email && (
                    <div style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid #1e293b'
                    }}>
                      <div style={{ color: '#64748b', marginBottom: 2, fontSize: 11 }}>
                        Contact
                      </div>
                      <div style={{ color: '#e2e8f0' }}>
                        {item.primaryContact.name}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>
                        {item.primaryContact.email}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </aside>
  );
}