// -------------- Updated Renewals Processor (No Connector Modifications) ----------------
// Add this to your backend/scripts/renewals-processor.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import from server (adjust if needed)
import { googleConnector } from '../src/connectors/google.js';  // Relative path to connector

// Helper functions (same as before)
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() || '';
    });
    records.push(record);
  }
  return records;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  try {
    const [day, month, year] = dateStr.split('/');
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function daysToExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date('2025-12-17');  // Hardcoded current date as per query
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function createDescription(record, purpose, actionItems) {
  const premium = parseFloat(record['Total Premium'] || 0);
  return [
    `🎯 PURPOSE: ${purpose}`,
    '',
    `📋 CLIENT INFORMATION:`,
    `Client: ${record['Client']}`,
    `Coverage: ${record['Coverage']}`,
    `Product Line: ${record['Product Line']}`,
    `Carrier: ${record['Carrier Group']}`,
    `Status: ${record['Placement Status']}`,
    `Premium: ₹${premium.toLocaleString('en-IN')}`,
    `Assigned to: ${record['Placement Specialist']}`,
    `Placement ID: ${record['Placement Id']}`,
    '',
    `📅 TIMELINE:`,
    `Expiry Date: ${record['Placement Expiry Date']}`,
    `Days to Expiry: ${daysToExpiry(parseDate(record['Placement Expiry Date']))}`,
    '',
    `✅ ACTION ITEMS:`,
    ...actionItems.map((item, i) => `${i + 1}. ${item}`),
  ].join('\n');
}

function getActionsForRecord(record) {
  const status = record['Placement Status'];
  const clientName = record['Client'];
  const expiryDate = parseDate(record['Placement Expiry Date']);
  const daysLeft = daysToExpiry(expiryDate);
  
  if (!expiryDate) return [];
  
  const today = new Date('2025-12-17').toISOString().split('T')[0];  // Hardcoded today
  const actions = [];

  switch (status) {
    case 'Quote':
      actions.push({
        title: `📞 Follow-up Call: ${clientName}`,
        description: createDescription(record, 'Follow up on quote', [
          'Discuss quote details', 'Address concerns', 'Set decision timeline'
        ]),
        date: addDays(today, 7),
        time: '10:00',
        duration: 30,
        colorId: '9'
      });
      break;

    case 'Submitted':
      actions.push({
        title: `🔍 Check Carrier Response: ${clientName}`,
        description: createDescription(record, 'Follow up with carrier', [
          'Check submission status', 'Request update', 'Document feedback'
        ]),
        date: addDays(today, 3),
        time: '11:00',
        duration: 15,
        colorId: '5'
      });
      break;

    case 'No Response':
      actions.push({
        title: `🚨 URGENT: Follow-up: ${clientName}`,
        description: createDescription(record, 'Immediate outreach required', [
          'Call client directly', 'Try alternative contacts', 'Document attempt'
        ]),
        date: addDays(today, 1),
        time: '09:30',
        duration: 20,
        colorId: '11'
      });
      break;

    case 'Bound':
    case 'Received':
      actions.push({
        title: `📄 Send Policy Documents: ${clientName}`,
        description: createDescription(record, 'Deliver policy documents', [
          'Compile documents', 'Email package', 'Confirm receipt'
        ]),
        date: addDays(today, 1),
        time: '10:00',
        duration: 45,
        colorId: '10'
      });
      break;
  }

  // Universal expiry alert (only if expiry is in the future)
  if (daysLeft && daysLeft > 0 && daysLeft <= 30) {  // Alert if expiring within 30 days
    actions.push({
      title: `🔔 POLICY EXPIRING SOON: ${clientName}`,
      description: createDescription(record, 'Policy expiring soon', [
        `⚠️ Policy expires in ${daysLeft} days`,
        'Initiate renewal process',
        'Contact client for renewal instructions',
        'Assess coverage needs and market options'
      ]),
      date: addDays(expiryDate, -7),  // Set alert 7 days before expiry
      time: '08:00',
      duration: 30,
      colorId: '11'
    });

    // Additional renewal initiation event 30 days before expiry
    if (daysLeft <= 30) {
      actions.push({
        title: `🔄 START RENEWAL: ${clientName}`,
        description: createDescription(record, 'Begin renewal process', [
          'Gather updated exposure data',
          'Review incumbent carrier performance',
          'Prepare submission to markets',
          'Schedule client meeting'
        ]),
        date: addDays(expiryDate, -30),
        time: '09:00',
        duration: 60,
        colorId: '6'
      });
    }
  }

  return actions;
}

// Updated deletion function: Skips if methods not available (no connector mods needed)
async function deleteFutureEventsForPlacement(placementId) {
  if (!placementId) return;

  // Check if required methods exist on connector
  if (typeof googleConnector.listEvents !== 'function' || typeof googleConnector.deleteEvent !== 'function') {
    console.warn(`⚠️ Skipping deletion for placement ${placementId}: listEvents or deleteEvent not available on googleConnector. Add them to src/connectors/google.js for full cleanup.`);
    return;
  }

  try {
    // List future events containing the Placement ID
    const futureEvents = await googleConnector.listEvents({
      timeMin: new Date('2025-12-17').toISOString(),  // Hardcoded today
      q: placementId  // Search for Placement ID
    });

    // Delete each matching event
    for (const event of futureEvents.items || []) {
      await googleConnector.deleteEvent(event.id);
      console.log(`Deleted event: ${event.summary} (ID: ${event.id})`);
    }
  } catch (error) {
    console.error(`Error deleting events for placement ${placementId}:`, error);
  }
}

// Fixed createCalendarEvent (as you mentioned you'll update this)
async function createCalendarEvent(action) {
  const startDateTime = `${action.date}T${action.time}:00`;
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + action.duration * 60000);

  const eventData = {
    summary: action.title,
    description: action.description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 }
      ],
    },
    colorId: action.colorId
  };

  try {
    const createdEvent = await googleConnector.createCalendarEvent(eventData);
    console.log(`Created event: ${action.title} (ID: ${createdEvent.id})`);
    return createdEvent;
  } catch (error) {
    console.error(`Error creating event: ${action.title}`, error);
  }
}

// Main processing function (updated with hardcoded date for testing)
async function processRenewalsAndUpdateCalendar() {
  try {
    const csvPath = path.join(__dirname, '../scripts/renewals.csv');  // Assumes CSV in backend/ root
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const records = parseCSV(csvText);

    console.log(`Processing ${records.length} records... (Current date: 2025-12-17)`);

    for (const record of records) {
      const placementId = record['Placement Id'];
      const expiryDate = parseDate(record['Placement Expiry Date']);
      
      // Skip if no valid expiry or not a renewal
      if (!placementId || !expiryDate || record['Production Code'] !== 'PRODUCTION_TYPE_RENEWAL') {
        continue;
      }

      // Step 1: Attempt deletion (skips if not supported)
      await deleteFutureEventsForPlacement(placementId);

      // Step 2: Generate new actions
      const actions = getActionsForRecord(record);

      // Step 3: Create new events (only future dates)
      const today = '2025-12-17';
      for (const action of actions) {
        if (action.date >= today) {
          await createCalendarEvent(action);
        } else {
          console.log(`Skipped past event: ${action.title}`);
        }
      }
    }

    console.log('Processing complete. Check Google Calendar for new events.');
  } catch (error) {
    console.error('Error in processRenewalsAndUpdateCalendar:', error);
  }
}

// Export for server integration
export { processRenewalsAndUpdateCalendar };

// To run standalone: node scripts/renewals-processor.js
// (Add at bottom if needed: processRenewalsAndUpdateCalendar().catch(console.error); )