// backend/src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiConfig } from "../config/oauth.js";

class AIService {
  constructor() {
    if (!geminiConfig.apiKey) {
      console.warn("⚠️ Gemini API key missing. AI disabled.");
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
      console.log("✅ Gemini AI initialized");
    }
  }

  // ----------------------------------------------------------
  // RETRY WRAPPER FOR GEMINI 503 ERRORS
  // ----------------------------------------------------------
  async runWithRetry(fn, retries = 3) {
    let attempt = 0;

    while (attempt < retries) {
      try {
        return await fn();
      } catch (err) {
        const msg = err?.message || "";
        if (msg.includes("503") || msg.includes("overloaded")) {
          const wait = [300, 800, 1500][attempt];
          console.warn(`⚠️ Gemini overloaded — retrying in ${wait}ms...`);
          await new Promise((res) => setTimeout(res, wait));
          attempt++;
        } else {
          throw err;
        }
      }
    }

    throw new Error("Gemini model unavailable after retries.");
  }

  // ----------------------------------------------------------
  // 1. AI-GENERATED RENEWAL BRIEF
  // ----------------------------------------------------------
  async generateBrief(renewal, score) {
    if (!this.genAI) return this.generateFallbackBrief(renewal, score);

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // --- PREPARE CONTEXT ---
    const comms = renewal.communications || {};
    const lastContact = comms.lastContactDate || "None";
    const daysSince = lastContact !== "None"
      ? Math.floor((new Date() - new Date(lastContact)) / (1000 * 60 * 60 * 24))
      : "N/A";

    const recentEmailSubjects = (comms.recentEmails || [])
      .map(e => `- Email: "${e.subject}" (${e.date})`)
      .join("\n") || "No recent emails";

    const recentMeetingSummaries = (comms.recentMeetings || [])
      .map(m => `- Meeting: "${m.summary}" (${m.date})`)
      .join("\n") || "No recent meetings";

    const prompt = `
Generate a renewal brief in JSON. Return ONLY JSON.

CLIENT:
${renewal.clientName}, ${renewal.policyNumber}, ${renewal.productLine}, ${renewal.carrier}

FINANCIAL:
Premium: ₹${renewal.premium}
Expiry: ${renewal.expiryDate}

STATUS:
Touchpoints: ${comms.totalTouchpoints || 0}
Last Contact: ${lastContact} (${daysSince} days ago)
Stage: ${renewal.status}

COMMUNICATION HISTORY:
${recentEmailSubjects}
${recentMeetingSummaries}

SCORES:
Priority: ${score.value}
Time Score: ${score.breakdown.timeScore}
Premium Score: ${score.breakdown.premiumScore}

LOGIC RULES (Apply these if relevant):
1. GHOSTING: If days since last contact > 14, explicitly recommend "Urgent re-engagement call".
2. MISSING FOLLOW-UP: If a meeting occurred > 2 days ago but no subsequent email, recommend "Send post-meeting summary".
3. LOW ENGAGEMENT: If total touchpoints < 3, recommend "Increase engagement frequency".
4. GOOD ENGAGEMENT: If touchpoints > 10 and recent contact < 7 days, recommend "Maintain current momentum".

Format:
{
  "summary": "...",
  "riskNotes": ["..."],
  "keyActions": ["..."],
  "outreachTemplate": "Subject: ...",
  "confidence": "high|medium|low"
}
    `;

    try {
      const result = await this.runWithRetry(() =>
        model.generateContent(prompt)
      );

      const raw = result.response.text().trim();
      const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        console.error("❌ Invalid AI brief JSON:", raw);
        return this.generateFallbackBrief(renewal, score);
      }

      return {
        ...parsed,
        _aiGenerated: true,
        _scoreBreakdown: score.breakdown,
      };
    } catch (err) {
      console.error("❌ AI brief error:", err.message);
      return this.generateFallbackBrief(renewal, score);
    }
  }

  // ----------------------------------------------------------
  // 2. FULLY PERSONALIZED OUTREACH EMAIL
  // ----------------------------------------------------------
  async generatePersonalizedEmail(renewal, brief) {
    if (!this.genAI) return this.generateFallbackEmail(renewal, brief);

    const days = brief._scoreBreakdown.daysToExpiry;
    const urgency =
      days <= 10 ? "critical" :
        days <= 30 ? "high" :
          days <= 60 ? "moderate" : "low";

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Write a 150–180 word outreach email to the client based on the renewal brief.
(use the information given below to enter the details in the email. Do NOT invent new information or leave empty placeholders)

Renewal Details:
Client: ${renewal.clientName}
Contact Contact Name: ${renewal.primaryContactName}
Policy: ${renewal.productLine} (${renewal.policyNumber})
Carrier: ${renewal.carrier}
Premium: ₹${renewal.premium}
Expiry: ${renewal.expiryDate}
Urgency: ${urgency}
Our Team Name : Broker Team

AI Brief Summary:
${brief.summary}

Key Risks:
${brief.riskNotes.map(r => "- " + r).join("\n")}

Required:
- Warm human tone
- Use insights from risk notes + actions
- Mention urgency naturally
- Invite them to schedule a renewal discussion
- DO NOT include placeholders like [Your Name]
- Return ONLY email body text (no JSON)

Write the email now:
    `;

    try {
      const response = await this.runWithRetry(() =>
        model.generateContent(prompt)
      );

      return response.response.text().trim();
    } catch (err) {
      console.error("❌ AI email error:", err.message);
      return this.generateFallbackEmail(renewal, brief);
    }
  }

  // ----------------------------------------------------------
  // FALLBACK EMAIL
  // ----------------------------------------------------------
  generateFallbackEmail(renewal, brief) {
    return `
Dear ${renewal.primaryContactName},

I hope you're doing well. I’m reaching out regarding your ${renewal.productLine} policy (${renewal.policyNumber}) with ${renewal.carrier}, which is due for renewal on ${renewal.expiryDate}.

Here are key considerations:
- Premium: ₹${renewal.premium.toLocaleString()}
- ${brief.riskNotes.join("\n- ")}

I'd like to walk through your renewal options and ensure your coverage remains fully aligned with your needs. Please let me know a convenient time for a quick call.

Regards,
Broker Team
    `.trim();
  }

  // ----------------------------------------------------------
  // FALLBACK BRIEF
  // ----------------------------------------------------------
  generateFallbackBrief(renewal, score) {
    return {
      summary: `${renewal.clientName}'s policy is due on ${renewal.expiryDate}.`,
      riskNotes: [
        `Days left: ${score.breakdown.daysToExpiry}`,
        `Touchpoints: ${renewal.recentTouchpoints}`,
      ],
      keyActions: ["Review coverage", "Request quotes", "Engage client"],
      outreachTemplate: `Subject: Renewal Discussion\n\nDear ${renewal.clientName}, your renewal is approaching.`,
      confidence: "medium",
      _aiGenerated: false,
      _scoreBreakdown: score.breakdown,
    };
  }

  // ----------------------------------------------------------
  // 3. AI QUESTION ANSWERING
  // ----------------------------------------------------------
  async answerQuestion(question, renewal) {
    if (!this.genAI) return this.answerQuestionFallback(question, renewal);

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Answer the insurance question in 2–3 sentences.

Question: ${question}

Policy Context:
Client: ${renewal.clientName}
Policy: ${renewal.policyNumber}
Product: ${renewal.productLine}
Premium: ₹${renewal.premium}
Expiry: ${renewal.expiryDate}
Touchpoints: ${renewal.recentTouchpoints}
Carrier: ${renewal.carrier}

Return only the answer text.
    `;

    try {
      const result = await this.runWithRetry(() =>
        model.generateContent(prompt)
      );
      return {
        answer: result.response.text().trim(),
        confidence: "high",
      };
    } catch {
      return this.answerQuestionFallback(question, renewal);
    }
  }

  // ----------------------------------------------------------
  // FALLBACK Q&A
  // ----------------------------------------------------------
  answerQuestionFallback(question, renewal) {
    const q = question.toLowerCase();
    const parts = [];

    if (q.includes("premium"))
      parts.push(`The premium is ₹${renewal.premium}.`);
    if (q.includes("expiry"))
      parts.push(`The policy expires on ${renewal.expiryDate}.`);
    if (q.includes("carrier"))
      parts.push(`The carrier is ${renewal.carrier}.`);
    if (q.includes("touchpoint"))
      parts.push(`${renewal.recentTouchpoints} touchpoints recorded.`);

    return {
      answer: parts.join(" ") || "I can assist with premium, expiry, status, and coverage questions.",
      confidence: "medium",
    };
  }
}

export const aiService = new AIService();
