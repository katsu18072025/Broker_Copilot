import express from 'express';
import { hubspotConnector } from '../connectors/hubspot.js';
import { googleConnector } from '../connectors/google.js';
import { tokenStore } from '../utils/tokenStore.js';
import { googleConfig } from '../config/oauth.js';

const router = express.Router();

// ============ HubSpot (Private App - No OAuth needed) ============

router.get('/debug/google-config', (req, res) => {
  res.json({
    clientId: googleConfig.clientId ? `${googleConfig.clientId.substring(0, 30)}...` : 'MISSING',
    clientSecretSet: !!googleConfig.clientSecret,
    clientSecretLength: googleConfig.clientSecret?.length || 0,
    redirectUri: googleConfig.redirectUri,
    scopesCount: googleConfig.scopes?.length || 0
  });
});

router.get('/hubspot', (req, res) => {
  res.json({
    message: 'HubSpot uses Private App token - no OAuth needed',
    connected: hubspotConnector.isConnected(),
    testEndpoint: '/auth/test/hubspot'
  });
});

// Test HubSpot connection
router.get('/test/hubspot', async (req, res) => {
  console.log('🔐 [HubSpot Connection] Test initiated at:', new Date().toISOString());
  console.log('🔐 [HubSpot Connection] Checking if token is configured...');

  const result = await hubspotConnector.testConnection();

  if (result.success) {
    console.log('✅ [HubSpot Connection] SUCCESS - Connection established!', {
      timestamp: new Date().toISOString(),
      contactCount: result.contactCount,
      message: result.message
    });
  } else {
    console.error('❌ [HubSpot Connection] FAILED - Connection error:', {
      timestamp: new Date().toISOString(),
      error: result.error
    });
  }

  res.json(result);
});

// Fetch HubSpot data
router.get('/hubspot/deals', async (req, res) => {
  try {
    const deals = await hubspotConnector.fetchDeals();
    res.json({ success: true, count: deals.length, deals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/hubspot/contacts', async (req, res) => {
  try {
    const contacts = await hubspotConnector.fetchContacts();
    res.json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Google OAuth ============

// Step 1: Redirect to Google login
router.get('/google', (req, res) => {
  const authUrl = googleConnector.getAuthUrl();
  res.redirect(authUrl);
});

// Step 2: Handle callback
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }

  const result = await googleConnector.exchangeCodeForToken(code);

  if (result.success) {
    res.redirect(`${process.env.FRONTEND_URL}?google=connected`);
  } else {
    res.redirect(`${process.env.FRONTEND_URL}?error=google_failed`);
  }
});

// Test Google connection
router.get('/test/google', async (req, res) => {
  const result = await googleConnector.testConnection();
  res.json(result);
});

// Test fetching emails
router.get('/google/emails', async (req, res) => {
  try {
    const emails = await googleConnector.fetchEmailsEnriched(5);
    res.json({ success: true, count: emails.length, emails });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CALENDAR ENDPOINTS ============

// Fetch calendar events
router.get('/google/calendar', async (req, res) => {
  try {
    const daysBack = parseInt(req.query.daysBack) || 90;
    const daysForward = parseInt(req.query.daysForward) || 365;

    const events = await googleConnector.fetchCalendarEvents(daysBack, daysForward);

    res.json({
      success: true,
      count: events.length,
      events,
      query: { daysBack, daysForward }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create calendar event
router.post('/google/calendar/create', async (req, res) => {
  try {
    const eventData = req.body;

    // Validate required fields
    if (!eventData.summary) {
      return res.status(400).json({
        success: false,
        error: 'Event summary (title) is required'
      });
    }

    // Validate date/time based on event type
    if (eventData.isAllDay) {
      if (!eventData.startDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate is required for all-day events (format: YYYY-MM-DD)'
        });
      }
    } else {
      if (!eventData.startDateTime || !eventData.endDateTime) {
        return res.status(400).json({
          success: false,
          error: 'startDateTime and endDateTime are required for timed events (ISO 8601 format)'
        });
      }
    }

    const result = await googleConnector.createCalendarEvent(eventData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Status ============

// Check connection status
router.get('/status', (req, res) => {
  res.json({
    hubspot: hubspotConnector.isConnected(),
    google: tokenStore.isGoogleConnected()
  });
});

// Clear Google tokens (for testing)
router.post('/clear', (req, res) => {
  tokenStore.clearAll();
  res.json({ message: 'Google tokens cleared' });
});

export default router;