// frontend/src/components/PriorityBreakdown.jsx

import React from 'react';

export default function PriorityBreakdown({ item }) {
  if (!item?._scoreBreakdown) {
    return (
      <div style={{ 
        padding: 16, 
        background: '#041022', 
        borderRadius: 8,
        border: '1px solid #1e293b',
        color: '#94a3b8',
        textAlign: 'center'
      }}>
        No priority score available
      </div>
    );
  }

  const breakdown = item._scoreBreakdown;
  const score = item.priorityScore;
  const label = item.priorityLabel;

  // Color coding for priority level
  const getScoreColor = (score) => {
    if (score >= 80) return '#ef4444'; // Red - Critical
    if (score >= 65) return '#f59e0b'; // Orange - High
    if (score >= 45) return '#3b82f6'; // Blue - Medium
    return '#6b7280'; // Gray - Low
  };

  // Factor bar component
  const FactorBar = ({ label, score, weighted, description, icon, warning }) => {
    const barColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
    
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 6 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>
              {label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {description}
            </span>
            <span style={{ 
              fontWeight: 'bold', 
              fontSize: 14,
              color: barColor,
              minWidth: 35,
              textAlign: 'right'
            }}>
              {score}/100
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div style={{ 
          height: 8, 
          background: '#0a1628', 
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #1e293b'
        }}>
          <div style={{
            height: '100%',
            width: `${score}%`,
            background: barColor,
            transition: 'width 0.3s ease',
            borderRadius: 4
          }} />
        </div>
        
        {/* Weighted contribution */}
        <div style={{ 
          fontSize: 11, 
          color: '#64748b',
          marginTop: 4,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>
            Contributes <span style={{ color: '#94a3b8', fontWeight: 600 }}>
              {weighted.toFixed(1)} points
            </span> to final score
          </span>
          {warning && (
            <span style={{ color: '#f59e0b' }}>⚠️ {warning}</span>
          )}
        </div>
      </div>
    );
  };

  // Check for missing data
  const warnings = [];
  if (!breakdown.hasExpiryDate) warnings.push('No expiry date');
  if (!breakdown.hasPremium) warnings.push('No premium amount');
  if (!breakdown.hasCommunications) warnings.push('No communication history');
  if (!breakdown.hasContact) warnings.push('Missing contact info');

  return (
    <div style={{ 
      background: '#041022', 
      padding: 20, 
      borderRadius: 8,
      border: '1px solid #1e293b'
    }}>
      {/* Header with overall score */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '2px solid #1e293b'
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>
            Priority Score Breakdown
          </h4>
          <p style={{ 
            margin: '4px 0 0', 
            fontSize: 12, 
            color: '#64748b' 
          }}>
            How this renewal was prioritized
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: 36, 
            fontWeight: 'bold',
            color: getScoreColor(score),
            lineHeight: 1
          }}>
            {score}
          </div>
          <div style={{ 
            fontSize: 12, 
            color: getScoreColor(score),
            fontWeight: 600,
            marginTop: 4
          }}>
            {label}
          </div>
        </div>
      </div>

      {/* Data quality warning */}
      {warnings.length > 0 && (
        <div style={{
          padding: 12,
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 6,
          marginBottom: 20,
          fontSize: 12,
          color: '#fbbf24'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            ⚠️ Limited Data Available
          </div>
          <div style={{ color: '#fcd34d' }}>
            {warnings.join(' • ')} — Score may be less accurate
          </div>
        </div>
      )}

      {/* Factor bars */}
      <div style={{ marginTop: 20 }}>
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

      {/* Scoring methodology */}
      <div style={{
        marginTop: 20,
        padding: 12,
        background: '#0a1628',
        borderRadius: 6,
        fontSize: 11,
        color: '#64748b',
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
          📐 Scoring Methodology
        </div>
        <div>
          • Time Urgency (40%): Days until expiry — critical renewals prioritized
          <br />
          • Deal Value (25%): Premium amount — larger deals get higher priority
          <br />
          • Engagement (15%): Communication history — active clients ranked higher
          <br />
          • Deal Stage (12%): Progress in pipeline — near-close deals prioritized
          <br />
          • Contact Quality (8%): Availability of contact info — easier outreach
        </div>
      </div>
    </div>
  );
}