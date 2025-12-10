// src/utils/scoreCalculator.js
export const computeScore = (item) => {
  const now = new Date();
  const exp = new Date(item.expiryDate);
  const days = Math.max(1, Math.round((exp - now) / (1000 * 60 * 60 * 24)));
  const timeScore = Math.max(0, 100 - days);
  const premiumScore = Math.min(40, Math.round(item.premium / 100000));
  const touchpointScore = Math.min(20, (item.recentTouchpoints || 0) * 4);
  const raw = timeScore + premiumScore + touchpointScore;
  const value = Math.max(10, Math.min(99, raw));

  return {
    value,
    breakdown: { timeScore, premiumScore, touchpointScore, daysToExpiry: days }
  };
};