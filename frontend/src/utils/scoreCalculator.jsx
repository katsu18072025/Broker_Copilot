// backend/src/utils/scoreCalculator.js

/**
 * Enhanced Priority Score Calculator with Clear, Understandable Factors
 * 
 * This calculator uses multiple intuitive factors that business users understand:
 * 1. Time Urgency (days until expiry)
 * 2. Deal Value (premium amount)
 * 3. Engagement Level (communication touchpoints)
 * 4. Deal Stage (how far along in the process)
 * 5. Contact Quality (do we have good contact info)
 */

/**
 * Calculate time urgency score based on days to expiry
 * Critical (90-100): 0-7 days
 * High (70-89): 8-30 days  
 * Medium (40-69): 31-60 days
 * Low (0-39): 60+ days
 */
function calculateTimeUrgency(expiryDate) {
  if (!expiryDate) return { score: 0, daysLeft: null, label: 'Unknown' };
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  let score = 0;
  let label = '';
  
  if (daysLeft < 0) {
    score = 100; // Expired - highest urgency
    label = 'EXPIRED';
  } else if (daysLeft <= 7) {
    score = 95;
    label = 'Critical';
  } else if (daysLeft <= 30) {
    score = 80;
    label = 'High';
  } else if (daysLeft <= 60) {
    score = 55;
    label = 'Medium';
  } else {
    score = 25;
    label = 'Low';
  }
  
  return { score, daysLeft, label };
}

/**
 * Calculate deal value score based on premium amount
 * Uses logarithmic scaling to handle wide range of values
 */
function calculateDealValue(premium, coveragePremium, commissionAmount) {
  // Use the highest available value
  const amount = premium || coveragePremium || commissionAmount || 0;
  
  if (amount === 0) return { score: 0, amount: 0, label: 'Unknown' };
  
  // Logarithmic scale for better distribution
  // ₹50K = 20, ₹500K = 50, ₹5M = 80, ₹50M+ = 100
  let score = 0;
  let label = '';
  
  if (amount >= 10000000) { // 10M+
    score = 100;
    label = 'Very High';
  } else if (amount >= 5000000) { // 5M+
    score = 85;
    label = 'High';
  } else if (amount >= 1000000) { // 1M+
    score = 65;
    label = 'Medium-High';
  } else if (amount >= 500000) { // 500K+
    score = 45;
    label = 'Medium';
  } else if (amount >= 100000) { // 100K+
    score = 25;
    label = 'Low-Medium';
  } else {
    score = 10;
    label = 'Low';
  }
  
  return { score, amount, label };
}

/**
 * Calculate engagement score based on communication touchpoints
 * More touchpoints = more engaged client
 */
function calculateEngagement(communications) {
  const touchpoints = communications?.totalTouchpoints || 0;
  const lastContactDate = communications?.lastContactDate;
  
  let score = 0;
  let label = '';
  
  // Base score on total touchpoints
  if (touchpoints === 0) {
    score = 0;
    label = 'No Contact';
  } else if (touchpoints >= 10) {
    score = 90;
    label = 'Very Active';
  } else if (touchpoints >= 5) {
    score = 70;
    label = 'Active';
  } else if (touchpoints >= 2) {
    score = 45;
    label = 'Moderate';
  } else {
    score = 20;
    label = 'Minimal';
  }
  
  // Penalty for stale contact
  if (lastContactDate) {
    const daysSinceContact = Math.floor(
      (new Date() - new Date(lastContactDate)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceContact > 60) {
      score = Math.max(0, score - 30);
      label = 'Stale';
    } else if (daysSinceContact > 30) {
      score = Math.max(0, score - 15);
    }
  }
  
  return { 
    score, 
    touchpoints, 
    lastContactDate,
    label 
  };
}

/**
 * Calculate deal stage score
 * Further along = higher priority (closer to closing)
 */
function calculateDealStage(status) {
  const stageScores = {
    'Renewed': 10, // Already done, low priority
    'Quote Comparison': 90, // Almost there!
    'Pricing Discussion': 75,
    'Pre-Renewal Review': 60,
    'Discovery': 40,
    'Contacted': 30,
    'New': 20,
  };
  
  const score = stageScores[status] || 40; // Default to mid-level
  
  let label = '';
  if (score >= 80) label = 'Near Close';
  else if (score >= 60) label = 'Active';
  else if (score >= 40) label = 'Early Stage';
  else label = 'Initial';
  
  return { score, stage: status || 'Unknown', label };
}

/**
 * Calculate contact quality score
 * Good contact info = easier to reach = higher priority
 */
function calculateContactQuality(primaryContact) {
  if (!primaryContact) {
    return { score: 0, hasEmail: false, hasPhone: false, label: 'No Contact' };
  }
  
  const hasEmail = !!primaryContact.email;
  const hasPhone = !!primaryContact.phone;
  const hasName = !!primaryContact.name && primaryContact.name !== 'Unknown';
  
  let score = 0;
  let label = '';
  
  if (hasEmail && hasPhone && hasName) {
    score = 100;
    label = 'Complete';
  } else if (hasEmail && hasName) {
    score = 75;
    label = 'Good';
  } else if (hasEmail) {
    score = 50;
    label = 'Basic';
  } else if (hasName) {
    score = 25;
    label = 'Partial';
  } else {
    score = 0;
    label = 'Missing';
  }
  
  return { score, hasEmail, hasPhone, hasName, label };
}

/**
 * Main score computation with weighted factors
 * Weights designed to prioritize time urgency while considering other factors
 */
export function computeScore(item) {
  // Calculate individual factor scores
  const timeUrgency = calculateTimeUrgency(item.expiryDate);
  const dealValue = calculateDealValue(
    item.premium, 
    item.coveragePremium, 
    item.commissionAmount
  );
  const engagement = calculateEngagement(item.communications);
  const dealStage = calculateDealStage(item.status);
  const contactQuality = calculateContactQuality(item.primaryContact);
  
  // Weighted scoring - emphasis on urgency and value
  const weights = {
    timeUrgency: 0.40,      // 40% - Most important
    dealValue: 0.25,        // 25% - Second most important
    engagement: 0.15,       // 15% - Shows client interest
    dealStage: 0.12,        // 12% - Progress indicator
    contactQuality: 0.08,   // 8% - Ease of outreach
  };
  
  const weightedScore = 
    (timeUrgency.score * weights.timeUrgency) +
    (dealValue.score * weights.dealValue) +
    (engagement.score * weights.engagement) +
    (dealStage.score * weights.dealStage) +
    (contactQuality.score * weights.contactQuality);
  
  // Round to 1 decimal place
  const finalScore = Math.round(weightedScore * 10) / 10;
  
  // Determine overall priority label
  let overallLabel = '';
  if (finalScore >= 80) overallLabel = 'Critical Priority';
  else if (finalScore >= 65) overallLabel = 'High Priority';
  else if (finalScore >= 45) overallLabel = 'Medium Priority';
  else overallLabel = 'Low Priority';
  
  return {
    value: finalScore,
    overallLabel,
    breakdown: {
      // Individual factor scores (0-100)
      timeUrgency: Math.round(timeUrgency.score),
      dealValue: Math.round(dealValue.score),
      engagement: Math.round(engagement.score),
      dealStage: Math.round(dealStage.score),
      contactQuality: Math.round(contactQuality.score),
      
      // Weighted contributions to final score
      timeUrgencyWeighted: Math.round(timeUrgency.score * weights.timeUrgency * 10) / 10,
      dealValueWeighted: Math.round(dealValue.score * weights.dealValue * 10) / 10,
      engagementWeighted: Math.round(engagement.score * weights.engagement * 10) / 10,
      dealStageWeighted: Math.round(dealStage.score * weights.dealStage * 10) / 10,
      contactQualityWeighted: Math.round(contactQuality.score * weights.contactQuality * 10) / 10,
      
      // Human-readable details
      daysToExpiry: timeUrgency.daysLeft,
      urgencyLabel: timeUrgency.label,
      dealAmount: dealValue.amount,
      dealValueLabel: dealValue.label,
      touchpoints: engagement.touchpoints,
      engagementLabel: engagement.label,
      stageLabel: dealStage.label,
      contactLabel: contactQuality.label,
      
      // Data availability flags (for UI to show warnings)
      hasExpiryDate: !!item.expiryDate,
      hasPremium: !!(item.premium || item.coveragePremium || item.commissionAmount),
      hasCommunications: !!(item.communications?.totalTouchpoints),
      hasContact: !!item.primaryContact?.email,
    }
  };
}

/**
 * Add priority scores to a list of renewal items and sort by priority
 */
export function withScores(list) {
  return list
    .map((item) => {
      const scoreData = computeScore(item);
      return {
        ...item,
        priorityScore: scoreData.value,
        priorityLabel: scoreData.overallLabel,
        _scoreBreakdown: scoreData.breakdown,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Log item structure for debugging
 */
export function logItemStructure(item) {
  console.log('\n📊 RENEWAL ITEM STRUCTURE:');
  console.log('├─ Basic Info:');
  console.log(`│  ├─ ID: ${item.id}`);
  console.log(`│  ├─ Client: ${item.clientName}`);
  console.log(`│  └─ Expiry: ${item.expiryDate || 'MISSING'}`);
  console.log('├─ Financial:');
  console.log(`│  ├─ Premium: ${item.premium || 'MISSING'}`);
  console.log(`│  ├─ Coverage Premium: ${item.coveragePremium || 'MISSING'}`);
  console.log(`│  └─ Commission: ${item.commissionAmount || 'MISSING'}`);
  console.log('├─ Communications:');
  console.log(`│  ├─ Total Touchpoints: ${item.communications?.totalTouchpoints || 'MISSING'}`);
  console.log(`│  ├─ Emails: ${item.communications?.emailCount || 0}`);
  console.log(`│  └─ Meetings: ${item.communications?.meetingCount || 0}`);
  console.log('└─ Contact:');
  console.log(`   ├─ Name: ${item.primaryContact?.name || 'MISSING'}`);
  console.log(`   ├─ Email: ${item.primaryContact?.email || 'MISSING'}`);
  console.log(`   └─ Phone: ${item.primaryContact?.phone || 'MISSING'}`);
  
  const score = computeScore(item);
  console.log(`\n🎯 CALCULATED SCORE: ${score.value} (${score.overallLabel})`);
  console.log('Factor Breakdown:');
  console.log(`├─ Time Urgency: ${score.breakdown.timeUrgency}/100 (${score.breakdown.urgencyLabel}) → ${score.breakdown.timeUrgencyWeighted} pts`);
  console.log(`├─ Deal Value: ${score.breakdown.dealValue}/100 (${score.breakdown.dealValueLabel}) → ${score.breakdown.dealValueWeighted} pts`);
  console.log(`├─ Engagement: ${score.breakdown.engagement}/100 (${score.breakdown.engagementLabel}) → ${score.breakdown.engagementWeighted} pts`);
  console.log(`├─ Deal Stage: ${score.breakdown.dealStage}/100 (${score.breakdown.stageLabel}) → ${score.breakdown.dealStageWeighted} pts`);
  console.log(`└─ Contact Quality: ${score.breakdown.contactQuality}/100 (${score.breakdown.contactLabel}) → ${score.breakdown.contactQualityWeighted} pts\n`);
}