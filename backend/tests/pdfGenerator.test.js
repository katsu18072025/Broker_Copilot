import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { generateBriefPDF } from '../src/services/pdfGenerator.js';

describe('PDF Generation', () => {

    it('should generate a valid PDF buffer', async () => {
        // Mock Data
        const item = {
            clientName: "Test Client PDF",
            premium: 50000,
            communications: { totalTouchpoints: 5 }
        };

        const brief = {
            summary: "Short summary",
            keyActions: ["Action 1", "Action 2"],
            outreachTemplate: "Email body"
        };

        // Generate
        const buffer = await generateBriefPDF(brief, item);

        // Verify it's a buffer
        assert.ok(Buffer.isBuffer(buffer), 'Output should be a Buffer');
        assert.ok(buffer.length > 0, 'Buffer should not be empty');

        // Verify PDF Header signature (%PDF)
        const header = buffer.toString('utf8', 0, 5); // first 5 chars
        // PDF files usually start with "%PDF-"
        assert.ok(header.startsWith('%PDF'), 'Buffer should start with PDF signature');
    });

});
