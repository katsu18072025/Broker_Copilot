// frontend/src/components/AIBrief.jsx

import React, { useState } from 'react';

// Priority Factors Section with Expandable Breakdown
function PriorityFactorsSection({ breakdown, item }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 80) return '#ef4444';
    if (score >= 65) return '#f59e0b';
    if (score >= 45) return '#3b82f6';
    return '#6b7280';
  };

  return (
    <>
      <h5 style={{ 
        margin: '16px 0 8px',
        fontSize: 13,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Priority Factors
      </h5>

      {/* Compact Summary View */}
      <div style={{ 
        fontSize: 12, 
        color: '#cbd5e1',
        background: '#0a1628',
        padding: 12,
        borderRadius: 6,
        lineHeight: 1.8
      }}>
        {breakdown.daysToExpiry !== null && breakdown.daysToExpiry !== undefined ? (
          <div>
            ⏰ <strong>Urgency:</strong>{' '}
            <span style={{ 
              color: breakdown.timeUrgency >= 80 ? '#ef4444' : breakdown.timeUrgency >= 50 ? '#f59e0b' : '#10b981'
            }}>
              {breakdown.daysToExpiry} days left
            </span>
            {' '}({breakdown.urgencyLabel})
          </div>
        ) : null}
        
        {breakdown.dealAmount > 0 && (
          <div>
            💰 <strong>Value:</strong>{' '}
            ₹{(breakdown.dealAmount / 100000).toFixed(1)}L{' '}
            ({breakdown.dealValueLabel})
          </div>
        )}
        
        {breakdown.touchpoints !== undefined && (
          <div>
            💬 <strong>Engagement:</strong>{' '}
            {breakdown.touchpoints} touchpoints{' '}
            ({breakdown.engagementLabel})
          </div>
        )}
        
        {breakdown.stageLabel && (
          <div>
            📊 <strong>Stage:</strong> {breakdown.stageLabel}
          </div>
        )}
        
        {breakdown.contactLabel && (
          <div>
            📧 <strong>Contact:</strong> {breakdown.contactLabel}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            marginTop: 12,
            padding: '6px 12px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 4,
            color: '#60a5fa',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(59, 130, 246, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(59, 130, 246, 0.15)';
          }}
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>{isExpanded ? 'Hide' : 'Show'} Detailed Score Breakdown</span>
        </button>
      </div>

      {/* Expandable Detailed Breakdown */}
      {isExpanded && (
        <div style={{
          marginTop: 12,
          padding: 16,
          background: '#041022',
          border: '1px solid #1e293b',
          borderRadius: 8,
          animation: 'slideDown 0.3s ease-out',
          overflow: 'hidden'
        }}>
          <style>
            {`
              @keyframes slideDown {
                from {
                  opacity: 0;
                  max-height: 0;
                  transform: translateY(-10px);
                }
                to {
                  opacity: 1;
                  max-height: 1000px;
                  transform: translateY(0);
                }
              }
            `}
          </style>
          {/* Overall Score Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid #1e293b'
          }}>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Overall Priority Score
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: getScoreColor(item.priorityScore),
                lineHeight: 1
              }}>
                {item.priorityScore}
              </div>
              <div style={{
                fontSize: 10,
                color: getScoreColor(item.priorityScore),
                fontWeight: 600
              }}>
                {item.priorityLabel || 'Not Rated'}
              </div>
            </div>
          </div>

          {/* Factor Bars */}
          <div style={{ marginTop: 12 }}>
            <FactorBar
              icon="⏰"
              label="Time Urgency"
              score={breakdown.timeUrgency}
              weighted={breakdown.timeUrgencyWeighted}
              description={`${breakdown.daysToExpiry !== null ? breakdown.daysToExpiry + ' days left' : 'No expiry date'} • ${breakdown.urgencyLabel}`}
              warning={!breakdown.hasExpiryDate ? 'Using default' : null}
            />

            <FactorBar
              icon="💰"
              label="Deal Value"
              score={breakdown.dealValue}
              weighted={breakdown.dealValueWeighted}
              description={`₹${(breakdown.dealAmount / 100000).toFixed(1)}L • ${breakdown.dealValueLabel}`}
              warning={!breakdown.hasPremium ? 'Using default' : null}
            />

            <FactorBar
              icon="💬"
              label="Engagement Level"
              score={breakdown.engagement}
              weighted={breakdown.engagementWeighted}
              description={`${breakdown.touchpoints} touchpoints • ${breakdown.engagementLabel}`}
              warning={!breakdown.hasCommunications ? 'No history' : null}
            />

            <FactorBar
              icon="📊"
              label="Deal Stage"
              score={breakdown.dealStage}
              weighted={breakdown.dealStageWeighted}
              description={breakdown.stageLabel}
            />

            <FactorBar
              icon="📧"
              label="Contact Quality"
              score={breakdown.contactQuality}
              weighted={breakdown.contactQualityWeighted}
              description={breakdown.contactLabel}
              warning={!breakdown.hasContact ? 'Missing email' : null}
            />
          </div>

          {/* Scoring Methodology */}
          <div style={{
            marginTop: 16,
            padding: 10,
            background: '#0a1628',
            borderRadius: 6,
            fontSize: 10,
            color: '#64748b',
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
              📐 How This Score Was Calculated
            </div>
            <div>
              • Time Urgency (40%) • Deal Value (25%) • Engagement (15%)
              <br />
              • Deal Stage (12%) • Contact Quality (8%)
            </div>
          </div>
        </div>
      )}

      {/* Data Quality Warning */}
      {(!breakdown.hasExpiryDate || !breakdown.hasPremium || !breakdown.hasCommunications) && (
        <div style={{
          marginTop: 12,
          padding: 10,
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 6,
          fontSize: 11,
          color: '#fbbf24'
        }}>
          ⚠️ Some data missing — priority score may be less accurate
        </div>
      )}
    </>
  );
}

// Factor Bar Component
function FactorBar({ label, score, weighted, description, icon, warning }) {
  const barColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 4
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13 }}>{icon}</span>
          <span style={{ fontWeight: 600, fontSize: 11, color: '#e2e8f0' }}>
            {label}
          </span>
        </div>
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: 12,
          color: barColor,
          minWidth: 30,
          textAlign: 'right'
        }}>
          {score}
        </span>
      </div>
      
      {/* Progress bar */}
      <div style={{ 
        height: 6, 
        background: '#0a1628', 
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid #1e293b',
        marginBottom: 3
      }}>
        <div style={{
          height: '100%',
          width: `${score}%`,
          background: barColor,
          transition: 'width 0.3s ease',
          borderRadius: 3
        }} />
      </div>
      
      {/* Description and weighted contribution */}
      <div style={{ 
        fontSize: 10, 
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 4
      }}>
        <span>{description}</span>
        <span>
          +{weighted.toFixed(1)} pts
          {warning && <span style={{ color: '#f59e0b', marginLeft: 4 }}>⚠️ {warning}</span>}
        </span>
      </div>
    </div>
  );
}

export default function AIBrief({ brief, item }) {
  if (!brief) {
    return <div style={{ color: '#9aa' }}>Generating AI brief...</div>;
  }
  
  if (brief.error) {
    return <div style={{ color: '#e74c3c' }}>{brief.error}</div>;
  }

  const breakdown = brief._scoreBreakdown || item?._scoreBreakdown;

  return (
    <>
      {/* AI Summary */}
      <div style={{ color: '#cfe', lineHeight: 1.6, marginBottom: 16 }}>
        {brief.summary}
        {brief._aiGenerated && (
          <span style={{ 
            marginLeft: 8, 
            fontSize: 11, 
            color: '#3498db',
            background: 'rgba(52, 152, 219, 0.1)',
            padding: '2px 6px',
            borderRadius: 3
          }}>
            ✨ AI
          </span>
        )}
      </div>

      {/* Risk Notes */}
      <h5 style={{ 
        margin: '16px 0 8px',
        fontSize: 13,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Risk Notes
      </h5>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {brief.riskNotes?.map((note, i) => (
          <li key={i} style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
            {note}
          </li>
        ))}
      </ul>

      {/* Priority Factors with Expandable Breakdown */}
      {breakdown && <PriorityFactorsSection breakdown={breakdown} item={item} />}
    </>
  );
}