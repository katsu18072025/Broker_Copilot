import { google } from "googleapis";
import { googleConfig } from "../config/oauth.js";
import { tokenStore } from "../utils/tokenStore.js";

/**
 * Google Connector for Gmail + Calendar
 * Fully supports:
 * - Email send
 * - Email fetch (metadata)
 * - Calendar fetch (with full details)
 * - Calendar event creation
 * - Auto token refresh
 */
export class GoogleConnector {
  constructor() {
    this.oauth2 = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );
  }

  /**
   * Generate OAuth URL
   */
  getAuthUrl() {
    return this.oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: googleConfig.scopes,
    });
  }

  /**
   * Exchange OAuth code for tokens
   */
  async exchangeCodeForToken(code) {
    try {
      const { tokens } = await this.oauth2.getToken(code);

      if (!tokens.refresh_token) {
        console.warn("⚠️ Google did NOT return refresh_token — user may have already granted access previously.");
      }

      this.oauth2.setCredentials(tokens);
      tokenStore.setGoogleToken(tokens);

      // Trigger persistence (setGoogleToken already does this, but being explicit)
      await tokenStore.saveToDisk();

      return { success: true, tokens };
    } catch (err) {
      console.error("❌ Google token exchange error:", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Load stored token + refresh automatically when expired
   */
  async getAuthenticatedClient() {
    const token = tokenStore.getGoogleToken();
    if (!token) throw new Error("Google not authenticated");

    this.oauth2.setCredentials(token);

    // Attempt refresh if access_token expired
    try {
      const newToken = await this.oauth2.getAccessToken();

      if (newToken?.token && newToken?.token !== token.access_token) {
        tokenStore.setGoogleToken({
          ...token,
          access_token: newToken.token,
          expires_in: 3600,
        });

        // Persist refreshed token
        await tokenStore.saveToDisk();
        console.log("🔄 Google access token refreshed");
      }
    } catch (err) {
      console.error("⚠️ Google token refresh failed:", err.message);
    }

    return this.oauth2;
  }

  // ===========================================================
  // ✉️ SEND EMAIL (Base64URL compliant) with attachment support
  // ===========================================================
  async sendEmail(to, subject, body, htmlBody, attachments = []) {
    try {
      const auth = await this.getAuthenticatedClient();
      const gmail = google.gmail({ version: "v1", auth });

      let email;

      if (attachments.length > 0) {
        // Multipart email with attachments
        const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const emailParts = [
          `To: ${to}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset="UTF-8"`,
          `Content-Transfer-Encoding: 7bit`,
          ``,
          htmlBody || body.replace(/\n/g, '<br>'),
          ``
        ];

        // Add attachments
        for (const attachment of attachments) {
          emailParts.push(`--${boundary}`);
          emailParts.push(`Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`);
          emailParts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
          emailParts.push(`Content-Transfer-Encoding: base64`);
          emailParts.push(``);

          // Split base64 into 76-character lines (RFC 2045)
          const base64Data = attachment.data.toString('base64');
          const lines = base64Data.match(/.{1,76}/g) || [];
          emailParts.push(lines.join('\n'));
          emailParts.push(``);
        }

        emailParts.push(`--${boundary}--`);
        email = emailParts.join('\n');
      } else {
        // Simple email (existing logic)
        email = [
          `To: ${to}`,
          `Subject: ${subject}`,
          `Content-Type: text/html; charset="UTF-8"`,
          `MIME-Version: 1.0`,
          ``,
          htmlBody || body.replace(/\n/g, '<br>'),
        ].join('\n');
      }

      const encoded = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encoded },
      });

      return { messageId: response.data.id };
    } catch (err) {
      console.error('❌ Gmail send error:', err.response?.data || err.message);
      throw new Error(err.message || 'Failed to send Gmail message');
    }
  }

  // ===========================================================
  // 📧 FETCH EMAILS (FULL metadata)
  // ===========================================================
  async fetchEmailsEnriched(maxResults = 50) {
    try {
      const auth = await this.getAuthenticatedClient();
      const gmail = google.gmail({ version: "v1", auth });

      const list = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: "after:2024/01/01",
      });

      const messages = list.data.messages || [];
      const enriched = [];

      for (const msg of messages) {
        try {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["From", "To", "Subject", "Date"],
          });

          const headers = detail.data.payload?.headers || [];
          const get = (n) => headers.find((h) => h.name === n)?.value || "";

          const fromEmail = (get("From").match(/[\w.-]+@[\w.-]+/) || [""])[0];
          const domain = fromEmail.split("@")[1]?.toLowerCase() || "";

          enriched.push({
            id: msg.id,
            threadId: detail.data.threadId,
            snippet: detail.data.snippet,
            date: get("Date"),
            from: get("From"),
            fromEmail,
            domain,
            to: get("To"),
            subject: get("Subject"),
            timestamp: detail.data.internalDate,
          });
        } catch (e) {
          console.warn("⚠️ Failed to fetch Gmail message:", e.message);
        }
      }

      return enriched;
    } catch (err) {
      console.error("❌ Gmail fetch error:", err.message);
      throw err;
    }
  }

  // ===========================================================
  // 📅 FETCH CALENDAR EVENTS (Enhanced with full details)
  // ===========================================================
  async fetchCalendarEvents(daysBack = 90, daysForward = 365) {
    try {
      const auth = await this.getAuthenticatedClient();
      const calendar = google.calendar({ version: "v3", auth });

      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - daysBack);

      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + daysForward);

      const resp = await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = (resp.data.items || []).map((e) => {
        const startDate = e.start?.dateTime || e.start?.date;
        const endDate = e.end?.dateTime || e.end?.date;

        return {
          id: e.id,
          summary: e.summary || "(No title)",
          description: e.description || "",
          location: e.location || "",
          start: startDate,
          end: endDate,
          startDateTime: e.start?.dateTime || null,
          startDate: e.start?.date || null,
          endDateTime: e.end?.dateTime || null,
          endDate: e.end?.date || null,
          isAllDay: !e.start?.dateTime, // All-day events don't have dateTime
          attendees: e.attendees?.map((a) => ({
            email: a.email,
            name: a.displayName || a.email,
            responseStatus: a.responseStatus || "needsAction",
            organizer: a.organizer || false,
          })) || [],
          organizer: {
            email: e.organizer?.email || "",
            name: e.organizer?.displayName || e.organizer?.email || "",
            self: e.organizer?.self || false,
          },
          status: e.status || "confirmed",
          htmlLink: e.htmlLink || "",
          created: e.created,
          updated: e.updated,
          recurringEventId: e.recurringEventId || null,
          recurrence: e.recurrence || null,
          reminders: e.reminders?.overrides || [],
          colorId: e.colorId || null,
          visibility: e.visibility || "default",
        };
      });

      // Log events to terminal
      console.log("\n📅 ========== CALENDAR EVENTS FETCHED ==========");
      console.log(`Total Events: ${events.length}`);
      console.log(`Time Range: ${timeMin.toISOString().split('T')[0]} to ${timeMax.toISOString().split('T')[0]}\n`);

      // Log birthdays and special occasions
      const birthdays = events.filter(e =>
        e.summary.toLowerCase().includes('birthday') ||
        e.recurrence?.some(r => r.includes('FREQ=YEARLY'))
      );

      const occasions = events.filter(e => {
        const lower = e.summary.toLowerCase();
        return lower.includes('anniversary') ||
          lower.includes('celebration') ||
          lower.includes('holiday');
      });

      if (birthdays.length > 0) {
        console.log(`🎂 Found ${birthdays.length} Birthday(s):`);
        birthdays.forEach(b => {
          console.log(`   - ${b.summary} on ${b.start}`);
        });
        console.log();
      }

      if (occasions.length > 0) {
        console.log(`🎉 Found ${occasions.length} Special Occasion(s):`);
        occasions.forEach(o => {
          console.log(`   - ${o.summary} on ${o.start}`);
        });
        console.log();
      }

      // Log upcoming events (next 7 days)
      const now = new Date();
      const next7Days = new Date();
      next7Days.setDate(next7Days.getDate() + 7);

      const upcomingEvents = events.filter(e => {
        const eventDate = new Date(e.start);
        return eventDate >= now && eventDate <= next7Days;
      });

      if (upcomingEvents.length > 0) {
        console.log(`📆 Upcoming Events (Next 7 Days): ${upcomingEvents.length}`);
        upcomingEvents.slice(0, 5).forEach(e => {
          const dateStr = new Date(e.start).toLocaleString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: e.isAllDay ? undefined : '2-digit',
            minute: e.isAllDay ? undefined : '2-digit'
          });
          console.log(`   - ${e.summary} | ${dateStr}${e.isAllDay ? ' (All Day)' : ''}`);
          if (e.attendees.length > 0) {
            console.log(`     Attendees: ${e.attendees.map(a => a.name || a.email).join(', ')}`);
          }
        });
        console.log();
      }

      console.log("========== END CALENDAR FETCH ==========\n");

      return events;
    } catch (err) {
      console.error("❌ Calendar fetch error:", err.message);
      return [];
    }
  }

  // ===========================================================
  // 📅 CREATE CALENDAR EVENT
  // ===========================================================
  async createCalendarEvent(eventData) {
    try {
      const auth = await this.getAuthenticatedClient();
      const calendar = google.calendar({ version: "v3", auth });

      // Build event object
      const event = {
        summary: eventData.summary,
        description: eventData.description || "",
        location: eventData.location || "",
        start: {},
        end: {},
        attendees: (eventData.attendees || []).map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: eventData.reminders || [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      };

      // Handle all-day vs timed events
      if (eventData.isAllDay) {
        event.start.date = eventData.startDate; // Format: 'YYYY-MM-DD'
        event.end.date = eventData.endDate || eventData.startDate;
      } else {
        event.start.dateTime = eventData.startDateTime; // Format: ISO 8601
        event.start.timeZone = eventData.timeZone || "Asia/Kolkata";
        event.end.dateTime = eventData.endDateTime;
        event.end.timeZone = eventData.timeZone || "Asia/Kolkata";
      }

      // Add recurrence if specified (e.g., for birthdays)
      if (eventData.recurrence) {
        event.recurrence = eventData.recurrence;
      }

      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      const created = response.data;

      // Log to terminal
      console.log("\n✅ ========== CALENDAR EVENT CREATED ==========");
      console.log(`Event ID: ${created.id}`);
      console.log(`Summary: ${created.summary}`);
      console.log(`Start: ${created.start?.dateTime || created.start?.date}`);
      console.log(`End: ${created.end?.dateTime || created.end?.date}`);
      if (created.description) console.log(`Description: ${created.description}`);
      if (created.location) console.log(`Location: ${created.location}`);
      if (created.attendees?.length > 0) {
        console.log(`Attendees: ${created.attendees.map(a => a.email).join(', ')}`);
      }
      if (created.recurrence) {
        console.log(`Recurrence: ${created.recurrence.join(', ')}`);
      }
      console.log(`Link: ${created.htmlLink}`);
      console.log("========== END EVENT CREATION ==========\n");

      return {
        success: true,
        eventId: created.id,
        htmlLink: created.htmlLink,
        event: created,
      };
    } catch (err) {
      console.error("❌ Calendar event creation error:", err.message);
      throw new Error(err.message || "Failed to create calendar event");
    }
  }

  // ===========================================================
  // CONNECTION TEST
  // ===========================================================
  async testConnection() {
    try {
      await this.getAuthenticatedClient();
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}

export const googleConnector = new GoogleConnector();