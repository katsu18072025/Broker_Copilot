import 'dotenv/config';
import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { dataOrchestrator } from '../src/services/dataOrchestrator.js';

describe('Data Orchestrator Matching Logic', () => {

    it('should match emails to deal by exact address', () => {
        // Mock deal
        const deal = {
            id: 'deal-1',
            properties: { dealname: 'Tech Corp Renewal' },
            primaryContact: { email: 'ceo@techcorp.com' }
        };

        // Mock emails
        const emails = [
            {
                id: 'e1',
                fromEmail: 'ceo@techcorp.com',
                subject: 'Renewal',
                snippet: 'Discussion about renewal',
                timestamp: Date.now(),
                threadId: 't1'
            },
            {
                id: 'e2',
                fromEmail: 'random@gmail.com',
                subject: 'Hi',
                snippet: 'Just saying hi',
                timestamp: Date.now(),
                threadId: 't2'
            }
        ];

        try {
            const matches = dataOrchestrator.matchEmailsToDeal(deal, emails, deal.primaryContact);
            console.log('DEBUG matches:', JSON.stringify(matches, null, 2));

            if (matches.length === 0) {
                console.log('DEBUG: Match failed.');
                console.log('Deal Contact:', deal.primaryContact);
                console.log('Email From:', emails[0].fromEmail);
            }

            assert.strictEqual(matches.length, 1);
            assert.strictEqual(matches[0].id, 'e1');
            assert.strictEqual(matches[0]._matchReason, 'exact_email_match');
        } catch (err) {
            console.error('TEST ERROR:', err);
            throw err;
        }
    });

    it('should match emails by domain', () => {
        // Mock deal with just company name, no contact email
        const deal = {
            id: 'deal-2',
            properties: { dealname: 'AcmeInc Policy' },
            primaryContact: null
        };

        const emails = [
            {
                id: 'e3',
                fromEmail: 'support@acmeinc.com',
                domain: 'acmeinc.com',
                subject: 'Questions',
                snippet: 'Question about policy',
                timestamp: Date.now(),
                threadId: 't3'
            }
        ];

        const matches = dataOrchestrator.matchEmailsToDeal(deal, emails, null);

        // Orchestrator extracts 'acmeinc.com' from 'AcmeInc Policy'
        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0]._matchReason, 'domain_match');
    });

    it('should match calendar events by attendee', () => {
        const deal = {
            id: 'deal-3',
            primaryContact: { email: 'client@example.com' }
        };

        const events = [
            {
                id: 'ev1',
                summary: 'Meeting',
                attendees: [
                    { email: 'me@broker.com' },
                    { email: 'client@example.com' }
                ],
                _matchScore: 0
            }
        ];

        const matches = dataOrchestrator.matchCalendarToDeal(deal, events, deal.primaryContact);

        assert.strictEqual(matches.length, 1);
        assert.strictEqual(matches[0].id, 'ev1');
    });

    it('should infer product line from deal name', () => {
        const p1 = dataOrchestrator.inferProductLine('Cyber Security Renewal');
        assert.strictEqual(p1, 'Cyber Liability');

        const p2 = dataOrchestrator.inferProductLine('Factory Fire Policy');
        assert.strictEqual(p2, 'General Insurance'); // Default fallthrough
    });

});
