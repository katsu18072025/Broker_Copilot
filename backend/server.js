// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";
import debugRoutes from './src/routes/debug.js';
import { renewals as sampleRenewals } from "./scripts/sampleData.js";
import { tokenStore } from "./src/utils/tokenStore.js";
import { dataOrchestrator } from "./src/services/dataOrchestrator.js";
import { aiService } from "./src/services/aiService.js";
import { hubspotConnector } from "./src/connectors/hubspot.js";
import { googleConnector } from "./src/connectors/google.js";
import { computeScore, withScores, logItemStructure } from "./src/utils/scoreCalculator.js";
import calendarSyncRoutes from "./src/routes/calendarSync.js";
import { generateBriefPDF } from "./src/services/pdfGenerator.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// OAuth routes
app.use("/auth", authRoutes);
app.use("/api/calendar-sync", calendarSyncRoutes);

// Debug routes (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/debug', debugRoutes);
}

// ---------------- ENDPOINTS ----------------

// Get renewals
app.get("/api/renewals", (req, res) => {
  const synced = dataOrchestrator.getRenewals();
  const renewals = synced.length ? synced : sampleRenewals;

  // 🔍 LOG FIRST ITEM STRUCTURE FOR DEBUGGING
  if (renewals.length > 0) {
    console.log('\n📊 LOGGING FIRST RENEWAL ITEM FOR COLUMN MAPPING:');
    logItemStructure(renewals[0]);
  }

  res.json({
    items: withScores(renewals),
    synced: synced.length > 0,
    source: synced.length > 0 ? "live" : "sample",
  });
});

// Get single renewal
app.get("/api/renewals/:id", (req, res) => {
  const synced = dataOrchestrator.getRenewals();
  const renewals = synced.length ? synced : sampleRenewals;

  const item = withScores(renewals).find((r) => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });

  res.json({ item });
});

// Generate AI brief
app.get("/api/renewals/:id/brief", async (req, res) => {
  const { brokerName } = req.query;
  const synced = dataOrchestrator.getRenewals();
  const renewals = synced.length ? synced : sampleRenewals;

  const item = renewals.find((r) => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });

  try {
    const scoreBreakdown = computeScore(item);
    const brief = await aiService.generateBrief(item, scoreBreakdown, brokerName);
    res.json({ brief });
  } catch (e) {
    console.error("Brief generation error:", e);
    res.status(500).json({ error: "Failed to generate brief" });
  }
});

// Generate & Download PDF
app.get("/api/renewals/:id/pdf", async (req, res) => {
  const synced = dataOrchestrator.getRenewals();
  const renewals = synced.length ? synced : sampleRenewals;

  const item = renewals.find((r) => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });

  try {
    const score = computeScore(item);
    const brief = await aiService.generateBrief(item, score);
    const pdfBuffer = await generateBriefPDF(brief, item);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${item.clientName.replace(/[^a-z0-9]/gi, '_')}_brief.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error("PDF Generation Error:", e);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// Connector status
app.get("/api/connectors", async (req, res) => {
  const syncStatus = dataOrchestrator.getSyncStatus();

  let hubspotStatus = hubspotConnector.isConnected() ? "connected" : "disconnected";
  // Manual connect requirement: Do NOT auto-test here. Status depends on manual trigger.

  res.json({
    connectors: [
      {
        name: "HubSpot CRM",
        status: hubspotStatus,
        lastSync: syncStatus.lastSync,
      },
      {
        name: "Google (Gmail/Calendar)",
        status: tokenStore.isGoogleConnected() ? "connected" : "disconnected",
        lastSync: syncStatus.lastSync,
        authUrl: "/auth/google",
      },
    ],
    syncStatus,
  });
});

// Token health check
app.get("/api/token-health", (req, res) => {
  const health = tokenStore.getHealthStatus();
  res.json({
    ...health,
    timestamp: new Date().toISOString()
  });
});

// Trigger sync
app.post("/api/sync", async (req, res) => {
  try {
    const result = await dataOrchestrator.syncAllData();

    // 🔍 LOG FIRST SYNCED ITEM STRUCTURE
    const synced = dataOrchestrator.getRenewals();
    if (synced.length > 0) {
      console.log('\n📊 LOGGING FIRST SYNCED ITEM AFTER SYNC:');
      logItemStructure(synced[0]);
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// AI Q&A
app.post("/api/qa", async (req, res) => {
  const { question, recordId } = req.body;
  if (!question)
    return res.json({
      answer: "Please ask a question about a renewal.",
      confidence: "low",
    });

  const synced = dataOrchestrator.getRenewals();
  const renewals = synced.length ? synced : sampleRenewals;

  const item = recordId ? renewals.find((r) => r.id === recordId) : null;
  if (!item)
    return res.json({
      answer: `I found ${renewals.length} renewal records. Please select one.`,
      confidence: "medium",
    });

  try {
    const response = await aiService.answerQuestion(question, item);
    res.json(response);
  } catch (e) {
    res.status(500).json({
      answer: "Error processing your question.",
      confidence: "low",
    });
  }
});

// ---------------- SEND EMAIL (Updated to support HTML and Attachments) ----------------
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body, htmlBody, renewalId, attachBrief, briefData } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: to, subject, body",
    });
  }

  if (!tokenStore.isGoogleConnected()) {
    return res.status(403).json({
      success: false,
      error: "Google not connected. Please connect Google.",
      needsAuth: true,
    });
  }

  try {
    const attachments = [];

    // Generate PDF attachment if requested
    if (attachBrief && briefData) {
      const { generateBriefPDF } = await import('./src/services/pdfGenerator.js');
      const pdfBuffer = await generateBriefPDF(briefData, briefData.item || briefData);

      const clientName = (briefData.item?.clientName || briefData.clientName || 'Renewal')
        .replace(/[^a-zA-Z0-9]/g, '_');

      attachments.push({
        filename: `${clientName}_AI_Brief.pdf`,
        mimeType: 'application/pdf',
        data: pdfBuffer
      });

      console.log(`📎 Generated PDF attachment: ${clientName}_AI_Brief.pdf`);
    }

    const result = await googleConnector.sendEmail(to, subject, body, htmlBody, attachments);

    console.log("📧 Email sent:", {
      to,
      subject,
      messageId: result.messageId,
      hasHtml: !!htmlBody,
      hasAttachments: attachments.length > 0,
      attachmentCount: attachments.length,
      renewalId,
    });

    res.json({
      success: true,
      provider: "Gmail",
      messageId: result.messageId,
      attachmentCount: attachments.length
    });
  } catch (error) {
    console.error("❌ Email send error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------- HEALTH ----------------
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "Broker Copilot Backend",
  });
});

app.post("/api/populate-calendar", async (req, res) => {
  if (!tokenStore.isGoogleConnected()) {
    return res.status(403).json({ error: "Google not connected" });
  }
  try {
    await processRenewalsAndUpdateCalendar();
    res.json({ success: true, message: "Calendar populated!" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- START SERVER ----------------

// Initialize token store (safe for serverless)
tokenStore.loadFromDisk().catch(err => {
  console.warn('⚠️ Token initialization warning:', err.message);
});

// Only start server if run directly (not imported) AND not on Vercel
if (process.argv[1] === import.meta.filename && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🔗 Google OAuth: ${process.env.FRONTEND_URL || 'http://localhost:' + PORT}/auth/google`);
    console.log(`💾 Token persistence: ${tokenStore.getHealthStatus().encryptionEnabled ? 'ENABLED' : 'DISABLED (in-memory only)'}`);

    // 🔄 AUTO-SYNC: Start initial sync
    console.log('⏳ Starting initial auto-sync...');
    dataOrchestrator.syncAllData()
      .then(result => console.log(`✅ Initial sync complete: ${result.renewalCount} records`))
      .catch(err => console.error('❌ Initial sync failed:', err.message));

    // ⏰ PERIODIC SYNC: Every 30 minutes
    setInterval(() => {
      console.log('⏰ Running periodic background sync...');
      dataOrchestrator.syncAllData().catch(err => console.error('❌ Background sync failed:', err.message));
    }, 30 * 60 * 1000);
  });
}

export default app;

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🛑 Server shutting down gracefully...');

  // Incognito mode: clear tokens on shutdown
  await tokenStore.clearOnShutdown();

  console.log('✅ Shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Server received SIGTERM...');

  // Incognito mode: clear tokens on shutdown
  await tokenStore.clearOnShutdown();

  console.log('✅ Shutdown complete');
  process.exit(0);
});
