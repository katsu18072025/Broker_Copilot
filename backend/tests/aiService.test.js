import 'dotenv/config';
import { test, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { aiService } from '../src/services/aiService.js';

describe('AI Service Logic', () => {

    it('should generate a brief structure with correct context', async () => {
        // Mock the external model generation to avoid API calls
        const mockResponse = {
            text: () => JSON.stringify({
                summary: "Mock Summary",
                keyActions: ["Action 1"],
                outreachTemplate: "Subject: Hello\n\nBody"
            })
        };

        // Mock the genAI instance directly
        aiService.genAI = {
            getGenerativeModel: () => ({
                generateContent: async (prompt) => {
                    promptUsed = prompt;
                    return {
                        response: {
                            text: () => JSON.stringify({
                                summary: "Mock Summary",
                                keyActions: ["Action 1"],
                                outreachTemplate: "Subject: Hello\n\nBody",
                                riskNotes: ["Risk 1"]
                            })
                        }
                    };
                }
            })
        };

        let promptUsed = "";

        const item = {
            clientName: "Test Client",
            expiryDate: "2024-12-31",
            communications: {
                lastContactDate: "2024-01-01", // Long time ago
                totalTouchpoints: 2
            }
        };

        const score = {
            value: 85,
            overallLabel: "High Priority",
            breakdown: {
                timeUrgency: 80,
                dealValue: 50,
                engagement: 20
            }
        };

        const result = await aiService.generateBrief(item, score);

        assert.strictEqual(result.summary, "Mock Summary");

        // VERIFY PROMPT LOGIC
        // Check if the prompt includes the Ghosting context we added earlier
        assert.ok(promptUsed.includes('LOGIC RULES'), 'Prompt should include LOGIC RULES section');
        assert.ok(promptUsed.includes('GHOSTING'), 'Prompt should detect Ghosting risk'); // 2024-01-01 is > 14 days ago

        // No restoration needed as we modify the export property, 
        // and tests are isolated enough or we don't care about side effects for now
    });

});
