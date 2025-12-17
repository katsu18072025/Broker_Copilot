import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { computeScore } from '../src/utils/scoreCalculator.js';

describe('Score Calculator', () => {

    it('should calculate critical urgency for expiring items', () => {
        const today = new Date();
        const expiry = new Date(today);
        expiry.setDate(today.getDate() + 2); // 2 days left

        const item = {
            expiryDate: expiry.toISOString(),
            premium: 0,
            communications: {},
            status: 'New'
        };

        const result = computeScore(item);

        // Time urgency is weighted 40%. 
        // < 7 days = score 95. 
        // 95 * 0.4 = 38
        // Other scores 0 or minimal default.
        // We expect a high score component for urgency.

        assert.strictEqual(result.breakdown.urgencyLabel, 'Critical');
        assert.ok(result.breakdown.timeUrgencyWeighted >= 38);
    });

    it('should calculate high deal value score', () => {
        const item = {
            expiryDate: null,
            premium: 10000000, // 10M+
            communications: {},
            status: 'New'
        };

        const result = computeScore(item);
        // 10M+ = score 100 on deal value.
        // Weight 25% -> 25 points.

        assert.strictEqual(result.breakdown.dealValueLabel, 'Very High');
        assert.strictEqual(result.breakdown.dealValue, 100);
        assert.strictEqual(result.breakdown.dealValueWeighted, 25);
    });

    it('should penalize ghosting (stale contact)', () => {
        const lastContact = new Date();
        lastContact.setDate(lastContact.getDate() - 70); // 70 days ago

        const item = {
            expiryDate: null,
            premium: 0,
            communications: {
                totalTouchpoints: 5,
                lastContactDate: lastContact.toISOString()
            },
            status: 'New'
        };

        const result = computeScore(item);
        // 5 touchpoints = 70 score "Active"
        // > 60 days stale = -30 penalty
        // expected = 40

        assert.strictEqual(result.breakdown.engagement, 40);
        assert.strictEqual(result.breakdown.engagementLabel, 'Stale');
    });

    it('should handle missing data gracefully', () => {
        const item = {
            id: 'empty-item'
        };

        const result = computeScore(item);

        assert.strictEqual(result.breakdown.timeUrgency, 0);
        assert.strictEqual(result.breakdown.dealValue, 0);
        assert.ok(result.value >= 0);
    });
});
