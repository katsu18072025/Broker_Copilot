import 'dotenv/config';
import express from "express";
import cors from "cors";
import authRoutes from './src/routes/auth.js';
import { renewals as sampleRenewals } from "./src/sampleData.js";
import { tokenStore } from './src/utils/tokenStore.js';
import { dataOrchestrator } from './src/services/dataOrchestrator.js';
import { aiService } from './src/services/aiService.js';
import { hubspotConnector } from './src/connectors/hubspot.js';
import { googleConnector } from './src/connectors/google.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// OAuth routes
app.use('/auth', authRoutes);

// Scoring function
function computeScore(item){
  const now=new Date(); 
  const exp=new Date(item.expiryDate);
  const days=Math.max(1, Math.round((exp-now)/(1000*60*60*24)));
  const timeScore=Math.max(0,100-days);
  const premiumScore=Math.min(40, Math.round(item.premium/100000));
  const touchpointScore=Math.min(20,(item.recentTouchpoints||0)*4);
  const raw=timeScore+premiumScore+touchpointScore;
  const bounded=Math.max(10, Math.min(99, raw));
  return { 
    value: bounded, 
    breakdown:{ timeScore, premiumScore, touchpointScore, daysToExpiry: days } 
  };
}

function withScores(list){ 
  return list.map(i=>({
    ...i, 
    priorityScore: computeScore(i).value, 
    _scoreBreakdown: computeScore(i).breakdown
  })).sort((a,b)=>b.priorityScore-a.priorityScore); 
}

// Get renewals (uses synced data if available, otherwise sample data)
app.get("/api/renewals", (req, res) => {
  const syncedRenewals = dataOrchestrator.getRenewals();
  const renewalsToUse = syncedRenewals.length > 0 ? syncedRenewals : sampleRenewals;
  
  res.json({
    items: withScores(renewalsToUse),
    synced: syncedRenewals.length > 0,
    source: syncedRenewals.length > 0 ? 'live' : 'sample'
  });
});

// Get single renewal
app.get("/api/renewals/:id", (req, res) => { 
  const syncedRenewals = dataOrchestrator.getRenewals();
  const renewalsToUse = syncedRenewals.length > 0 ? syncedRenewals : sampleRenewals;
  const it = withScores(renewalsToUse).find(r => r.id === req.params.id); 
  
  if (!it) return res.status(404).json({error: "not found"}); 
  res.json({item: it}); 
});

// Generate AI-powered brief
app.get("/api/renewals/:id/brief", async (req, res) => { 
  const syncedRenewals = dataOrchestrator.getRenewals();
  const renewalsToUse = syncedRenewals.length > 0 ? syncedRenewals : sampleRenewals;
  const item = renewalsToUse.find(r => r.id === req.params.id); 
  
  if (!item) return res.status(404).json({error: "not found"}); 
  
  const scoreBreakdown = computeScore(item);
  
  try {
    // Use AI service to generate brief
    const brief = await aiService.generateBrief(item, scoreBreakdown);
    res.json({brief});
  } catch (error) {
    console.error('Brief generation error:', error);
    res.status(500).json({error: 'Failed to generate brief'});
  }
});

// Connector status
app.get("/api/connectors", async (req, res) => {
  const now = new Date(); 
  const min = (m) => new Date(now.getTime() - m * 60000).toISOString();
  
  const syncStatus = dataOrchestrator.getSyncStatus();
  
  // Test HubSpot connection status dynamically
  let hubspotStatus = 'disconnected';
  try {
    const hubspotTest = await hubspotConnector.testConnection();
    hubspotStatus = hubspotTest.success ? 'connected' : 'disconnected';
  } catch (e) {
    console.error('HubSpot status check failed:', e.message);
  }
  
  const connectors = [
    {
      name: 'HubSpot CRM', 
      status: hubspotStatus,
      lastSync: syncStatus.lastSync || (hubspotStatus === 'connected' ? min(12) : null),
    },
    {
      name: 'Google (Gmail/Calendar)', 
      status: tokenStore.isGoogleConnected() ? 'connected' : 'disconnected', 
      lastSync: syncStatus.lastSync || (tokenStore.isGoogleConnected() ? min(18) : null),
      authUrl: '/auth/google'
    }
  ];
  
  res.json({
    connectors,
    syncStatus: {
      lastSync: syncStatus.lastSync,
      recordCount: syncStatus.recordCount,
      hasSynced: syncStatus.hasSynced
    }
  });
});

// Trigger data sync
app.post("/api/sync", async (req, res) => {
  console.log('📥 Sync request received');
  
  try {
    const result = await dataOrchestrator.syncAllData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy endpoint (kept for compatibility)
app.post("/api/simulate-sync", async (req, res) => {
  const result = await dataOrchestrator.syncAllData();
  res.json(result);
});

// AI-powered Q&A
app.post("/api/qa", async (req, res) => {
  const {question, recordId} = req.body || {};
  
  if (!question) {
    return res.json({
      answer: 'Please ask a question about a renewal.',
      confidence: 'low'
    });
  }

  const syncedRenewals = dataOrchestrator.getRenewals();
  const renewalsToUse = syncedRenewals.length > 0 ? syncedRenewals : sampleRenewals;
  const item = recordId ? renewalsToUse.find(r => r.id === recordId) : null;
  
  if (!item) {
    return res.json({
      answer: `I found ${renewalsToUse.length} renewal records. Please select a specific renewal to ask questions about.`,
      confidence: 'medium'
    });
  }

  try {
    const response = await aiService.answerQuestion(question, item);
    res.json(response);
  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({
      answer: 'Sorry, I encountered an error processing your question.',
      confidence: 'low',
      error: error.message
    });
  }
});

// Send outreach email via Google
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body, renewalId } = req.body;
  
  if (!to || !subject || !body) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, body'
    });
  }

  try {
    // Check if Google is connected
    if (!tokenStore.isGoogleConnected()) {
      return res.status(403).json({
        success: false,
        error: 'Google not connected. Please connect Google first to send emails.',
        needsAuth: true
      });
    }

    // Send via Google
    const result = await googleConnector.sendEmail(to, subject, body);
    
    console.log('✅ Email sent via Gmail:', {
      to,
      subject,
      messageId: result.messageId,
      renewalId,
      timestamp: new Date().toISOString()
    });
    
    return res.json({
      success: true,
      provider: 'Gmail',
      messageId: result.messageId,
      message: `Email successfully sent to ${to}`
    });
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: 'running',
    message: 'Broker Copilot Backend - OAuth & AI Enabled',
    endpoints: {
      oauth: '/auth/*',
      renewals: '/api/renewals',
      sync: '/api/sync',
      qa: '/api/qa'
    }
  });
});

app.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📝 OAuth endpoints:');
  console.log('   - HubSpot: http://localhost:' + PORT + '/auth/test/hubspot');
  console.log('   - Google: http://localhost:' + PORT + '/auth/google');
  console.log('   - Status: http://localhost:' + PORT + '/auth/status');
  console.log('🔄 Data endpoints:');
  console.log('   - Sync: http://localhost:' + PORT + '/api/sync (POST)');
  console.log('   - Renewals: http://localhost:' + PORT + '/api/renewals');
});