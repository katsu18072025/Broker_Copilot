import { google } from 'googleapis';
import { googleConfig } from '../config/oauth.js';
import { tokenStore } from '../utils/tokenStore.js';

export class GoogleConnector {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: googleConfig.scopes,
      prompt: 'consent'
    });
  }

  async exchangeCodeForToken(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      tokenStore.setGoogleToken(tokens);
      return { success: true, data: tokens };
    } catch (error) {
      console.error('Google token exchange error:', error.message);
      return { success: false, error: error.message };
    }
  }

  getAuthenticatedClient() {
    const token = tokenStore.getGoogleToken();
    if (!token) throw new Error('Not authenticated');
    this.oauth2Client.setCredentials(token);
    return this.oauth2Client;
  }

  async testConnection() {
    try {
      const auth = this.getAuthenticatedClient();
      const gmail = google.gmail({ version: 'v1', auth });
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1
      });
      return { 
        success: true, 
        message: 'Google connection working!',
        sampleData: response.data 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch emails with FULL metadata (enriched for matching)
   */
  async fetchEmailsEnriched(maxResults = 50) {
    try {
      const auth = this.getAuthenticatedClient();
      const gmail = google.gmail({ version: 'v1', auth });
      
      console.log('📧 [Google] Fetching emails with full metadata...');
      
      // Fetch recent emails (broader query)
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'after:2024/01/01' // Get emails from this year
      });

      const messages = response.data.messages || [];
      console.log(`📧 [Google] Found ${messages.length} messages`);
      
      if (messages.length === 0) {
        return [];
      }

      // Fetch full details for each message (in batches to avoid rate limits)
      const enrichedEmails = [];
      
      for (const message of messages) {
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date']
          });

          const headers = detail.data.payload?.headers || [];
          const from = headers.find(h => h.name === 'From')?.value || '';
          const to = headers.find(h => h.name === 'To')?.value || '';
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const dateStr = headers.find(h => h.name === 'Date')?.value || '';

          // Extract email address and domain
          const fromEmailMatch = from.match(/[\w.-]+@[\w.-]+\.\w+/);
          const fromEmail = fromEmailMatch ? fromEmailMatch[0].toLowerCase() : '';
          const domainMatch = fromEmail.match(/@([\w.-]+)/);
          const domain = domainMatch ? domainMatch[1].toLowerCase() : '';

          enrichedEmails.push({
            id: message.id,
            threadId: detail.data.threadId,
            from: from,
            fromEmail: fromEmail,
            domain: domain,
            to: to,
            subject: subject,
            date: dateStr,
            timestamp: detail.data.internalDate,
            snippet: detail.data.snippet || ''
          });

        } catch (err) {
          console.warn(`⚠️ Failed to fetch message ${message.id}:`, err.message);
        }
      }

      console.log(`✅ [Google] Enriched ${enrichedEmails.length} emails with full metadata`);
      return enrichedEmails;

    } catch (error) {
      console.error('❌ [Google] Fetch emails error:', error.message);
      throw error;
    }
  }

  /**
   * Fetch calendar events (for meeting history)
   */
  async fetchCalendarEvents(daysBack = 90) {
    try {
      const auth = this.getAuthenticatedClient();
      const calendar = google.calendar({ version: 'v3', auth });

      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - daysBack);

      console.log('📅 [Google] Fetching calendar events...');

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      console.log(`✅ [Google] Found ${events.length} calendar events`);

      return events.map(event => ({
        id: event.id,
        summary: event.summary || '',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        attendees: event.attendees?.map(a => a.email) || [],
        organizer: event.organizer?.email || ''
      }));

    } catch (error) {
      console.error('❌ [Google] Fetch calendar error:', error.message);
      // Don't throw - calendar is optional
      return [];
    }
  }

  /**
   * Legacy method (kept for compatibility)
   */
  async fetchEmails(maxResults = 10) {
    try {
      const auth = this.getAuthenticatedClient();
      const gmail = google.gmail({ version: 'v1', auth });
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: 'subject:(renewal OR policy OR insurance)'
      });

      const messages = response.data.messages || [];
      const emailDetails = [];

      for (const message of messages.slice(0, 5)) {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });
        emailDetails.push(detail.data);
      }

      return emailDetails;
    } catch (error) {
      console.error('Google fetch emails error:', error.message);
      throw error;
    }
  }

  async sendEmail(to, subject, body) {
    try {
      const auth = this.getAuthenticatedClient();
      const gmail = google.gmail({ version: 'v1', auth });

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedEmail }
      });

      return { success: true, messageId: response.data.id };
    } catch (error) {
      console.error('Google send email error:', error.message);
      throw error;
    }
  }
}

export const googleConnector = new GoogleConnector();