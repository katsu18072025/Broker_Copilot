import 'dotenv/config';

export const hubspotConfig = {
  clientId: process.env.HUBSPOT_CLIENT_ID,
  clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
  redirectUri: process.env.HUBSPOT_REDIRECT_URI,
  scopes: ['crm.objects.deals.read', 'crm.objects.contacts.read', 'crm.objects.companies.read'],
  authUrl: 'https://app.hubspot.com/oauth/authorize',
  tokenUrl: 'https://api.hubapi.com/oauth/v1/token'
};

export const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',  // Added: Create/edit events
    'https://www.googleapis.com/auth/drive.readonly'
  ],
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token'
};

export const geminiConfig = {
  apiKey: process.env.GEMINI_API_KEY
};