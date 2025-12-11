import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiConfig } from '../config/oauth.js';

class AIService {
  constructor() {
    if (!geminiConfig.apiKey) {
      console.warn('⚠️ Gemini API key not configured. AI features will be limited.');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
      console.log('✅ Gemini AI initialized');
    }
  }

  /**
   * Generate renewal brief using AI
   */
  /**
 * Generate renewal brief using AI
 */
    async generateBrief(renewal, scoreBreakdown) {
        if (!this.genAI) {
            return this.generateFallbackBrief(renewal, scoreBreakdown);
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            
            const prompt = `You are an insurance broker assistant. Generate a concise renewal brief for the following policy:

        **Client Details:**
        - Name: ${renewal.clientName}
        - Policy Number: ${renewal.policyNumber}
        - Carrier: ${renewal.carrier}
        - Product Line: ${renewal.productLine}

        **Financial:**
        - Premium: ₹${renewal.premium.toLocaleString()}
        - Expiry Date: ${renewal.expiryDate}

        **Engagement:**
        - Recent Touchpoints: ${renewal.recentTouchpoints}
        - Status: ${renewal.status}

        **Priority Score:** ${scoreBreakdown.value}/100
        - Days to Expiry: ${scoreBreakdown.breakdown.daysToExpiry}
        - Time Score: ${scoreBreakdown.breakdown.timeScore}
        - Premium Score: ${scoreBreakdown.breakdown.premiumScore}
        - Touchpoint Score: ${scoreBreakdown.breakdown.touchpointScore}

        Generate a JSON response with:
        1. "summary": 2-3 sentence overview
        2. "riskNotes": Array of 2-3 risk considerations
        3. "keyActions": Array of 3-4 specific action items
        4. "outreachTemplate": Professional email template AS A SINGLE STRING (must include "Subject:" line at the top)
        5. "confidence": "high", "medium", or "low"

        IMPORTANT: outreachTemplate must be a plain text string with line breaks (\\n), not an object.

        Keep it concise and actionable. Return ONLY valid JSON, no markdown.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse AI response
            let aiData;
            try {
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            aiData = JSON.parse(cleanText);
            
            // CRITICAL: Ensure outreachTemplate is a string
            if (typeof aiData.outreachTemplate !== 'string') {
                console.warn('AI returned non-string outreachTemplate, using fallback');
                throw new Error('Invalid template format');
            }
            
            } catch (parseError) {
            console.error('Failed to parse AI response:', text);
            return this.generateFallbackBrief(renewal, scoreBreakdown);
            }

            return {
            ...aiData,
            sources: [{
                type: 'CRM',
                system: renewal.sourceSystem,
                recordId: renewal.crmRecordId
            }],
            _scoreBreakdown: scoreBreakdown.breakdown,
            _aiGenerated: true
            };

        } catch (error) {
            console.error('AI generation error:', error.message);
            return this.generateFallbackBrief(renewal, scoreBreakdown);
        }
    }

  /**
   * Fallback brief generation (template-based)
   */
  generateFallbackBrief(renewal, scoreBreakdown) {
    const daysToExpiry = scoreBreakdown.breakdown.daysToExpiry;
    const urgency = daysToExpiry <= 30 ? 'urgent' : daysToExpiry <= 60 ? 'moderate' : 'low';

    return {
      summary: `${renewal.clientName}'s ${renewal.productLine} policy (${renewal.policyNumber}) with ${renewal.carrier} expires on ${renewal.expiryDate}. Premium: ₹${renewal.premium.toLocaleString()}. Priority score: ${scoreBreakdown.value}/100.`,
      
      riskNotes: [
        daysToExpiry <= 30 
          ? `⚠️ Urgent: Only ${daysToExpiry} days until expiry`
          : `Renewal in ${daysToExpiry} days`,
        renewal.recentTouchpoints === 0
          ? '⚠️ No recent client engagement detected'
          : `${renewal.recentTouchpoints} recent touchpoint(s) recorded`,
        renewal.premium > 1000000
          ? '💰 High-value account requiring senior review'
          : 'Standard renewal process applicable'
      ],
      
      keyActions: [
        'Review current coverage and exposures',
        'Check claims history and loss ratios',
        'Request updated carrier quotes',
        daysToExpiry <= 45 ? 'Schedule renewal meeting immediately' : 'Schedule renewal discussion',
        'Prepare comparison analysis for client'
      ].slice(0, 4),
      
      outreachTemplate: `Subject: ${renewal.clientName} – ${renewal.productLine} Renewal Discussion

Dear ${renewal.primaryContactName},

I hope this email finds you well. I'm reaching out regarding your ${renewal.productLine} policy (${renewal.policyNumber}) with ${renewal.carrier}, which is due for renewal on ${renewal.expiryDate}.

As your insurance broker, I'd like to schedule a brief call to:
- Review your current coverage (₹${renewal.premium.toLocaleString()} premium)
- Discuss any changes in your risk exposures
- Present competitive market options for your consideration

${daysToExpiry <= 45 ? 'Given the proximity to your renewal date, I recommend we connect within the next few days.' : 'Please let me know your availability for a discussion in the coming weeks.'}

Looking forward to hearing from you.

Best regards,
[Your Name]
Insurance Broker`,
      
      confidence: scoreBreakdown.value >= 70 ? 'high' : scoreBreakdown.value >= 50 ? 'medium' : 'low',
      
      sources: [{
        type: 'CRM',
        system: renewal.sourceSystem,
        recordId: renewal.crmRecordId
      }],
      
      _scoreBreakdown: scoreBreakdown.breakdown,
      _aiGenerated: false
    };
  }

  /**
   * Answer questions about renewals using AI
   */
  async answerQuestion(question, renewal) {
    if (!this.genAI) {
      return this.answerQuestionFallback(question, renewal);
    }

    try {
      // Use gemini-2.5-flash (stable, faster, cost-effective replacement for 1.5-flash)
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const prompt = `You are an insurance broker assistant. Answer this question about a renewal:

**Question:** ${question}

**Policy Context:**
- Client: ${renewal.clientName}
- Policy: ${renewal.policyNumber}
- Carrier: ${renewal.carrier}
- Product: ${renewal.productLine}
- Premium: ₹${renewal.premium.toLocaleString()}
- Expiry: ${renewal.expiryDate}
- Status: ${renewal.status}
- Touchpoints: ${renewal.recentTouchpoints}

Provide a concise, helpful answer in 2-3 sentences. Be specific and reference the actual data.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text();

      return {
        answer: answer.trim(),
        confidence: 'high',
        source: {
          system: renewal.sourceSystem,
          crmRecordId: renewal.crmRecordId
        }
      };

    } catch (error) {
      console.error('AI Q&A error:', error.message);
      return this.answerQuestionFallback(question, renewal);
    }
  }

  /**
   * Fallback Q&A (keyword matching)
   */
  answerQuestionFallback(question, renewal) {
    const q = question.toLowerCase();
    const parts = [];

    if (q.includes('premium') || q.includes('cost') || q.includes('price')) {
      parts.push(`The premium is ₹${renewal.premium.toLocaleString()}.`);
    }
    if (q.includes('expiry') || q.includes('expire') || q.includes('renewal') || q.includes('when')) {
      parts.push(`The policy expires on ${renewal.expiryDate}.`);
    }
    if (q.includes('carrier') || q.includes('insurer') || q.includes('company')) {
      parts.push(`The carrier is ${renewal.carrier}.`);
    }
    if (q.includes('status') || q.includes('stage')) {
      parts.push(`Current status: ${renewal.status}.`);
    }
    if (q.includes('touchpoint') || q.includes('contact') || q.includes('communication')) {
      parts.push(`There have been ${renewal.recentTouchpoints} recent touchpoint(s).`);
    }
    if (q.includes('client') || q.includes('customer') || q.includes('name')) {
      parts.push(`Client name: ${renewal.clientName}.`);
    }

    if (parts.length === 0) {
      parts.push(`I can answer questions about premium, expiry date, carrier, status, and touchpoints for ${renewal.clientName}.`);
    }

    return {
      answer: parts.join(' '),
      confidence: 'medium',
      source: {
        system: renewal.sourceSystem,
        crmRecordId: renewal.crmRecordId
      }
    };
  }
}

export const aiService = new AIService();