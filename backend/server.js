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
  const synced = dataOrchestrator.getRenewals();
  const renewals = synced.length ? synced : sampleRenewals;

  const item = renewals.find((r) => r.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });

  try {
    const scoreBreakdown = computeScore(item);
    const brief = await aiService.generateBrief(item, scoreBreakdown);
    res.json({ brief });
  } catch (e) {
    console.error("Brief generation error:", e);
    res.status(500).json({ error: "Failed to generate brief" });
  }
});

// Connector status
app.get("/api/connectors", async (req, res) => {
  const syncStatus = dataOrchestrator.getSyncStatus();

  let hubspotStatus = "disconnected";
  try {
    const test = await hubspotConnector.testConnection();
    hubspotStatus = test.success ? "connected" : "disconnected";
  } catch { }

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

// ---------------- SEND EMAIL (Updated to support HTML) ----------------
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body, htmlBody, renewalId } = req.body;

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
    // Send with both plain text and HTML to prevent line wrap issues
    const result = await googleConnector.sendEmail(to, subject, body, htmlBody);

    console.log("📧 Email sent:", {
      to,
      subject,
      messageId: result.messageId,
      hasHtml: !!htmlBody,
      renewalId,
    });

    res.json({
      success: true,
      provider: "Gmail",
      messageId: result.messageId,
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Google OAuth: http://localhost:${PORT}/auth/google`);
});

