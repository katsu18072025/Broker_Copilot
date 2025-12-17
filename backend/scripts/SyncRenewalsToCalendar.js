// backend/scripts/syncRenewalsToCalendar.js
import 'dotenv/config';
import { googleConnector } from '../src/connectors/google.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * REALISTIC CALENDAR SCHEDULER
 * - No overlapping events per specialist
 * - Smart time allocation throughout business hours
 * - One action per client per day
 * - Respects lunch breaks
 */

class SmartScheduler {
  constructor() {
    // Track scheduled events by specialist and date
    this.schedule = {}; // { 'Mary Jackson': { '2025-12-24': [{ start: '09:00', end: '09:30' }] } }
    // GLOBAL time slot tracker (all specialists combined)
    this.globalSchedule = {}; // { '2025-12-24': [{ start: '09:00', end: '09:30' }] }
    this.businessHours = { start: 9, end: 17 }; // 9 AM - 5 PM
    this.lunchBreak = { start: 12.5, end: 13.5 }; // 12:30 PM - 1:30 PM
    this.clientDayTracker = {}; // { 'Global Technologies': { '2025-12-24': true } }
  }

  /**
   * Initialize specialist schedule for a date
   */
  initSpecialistDate(specialist, date) {
    if (!this.schedule[specialist]) {
      this.schedule[specialist] = {};
    }
    if (!this.schedule[specialist][date]) {
      this.schedule[specialist][date] = [];
    }
    // Also initialize global schedule
    if (!this.globalSchedule[date]) {
      this.globalSchedule[date] = [];
    }
  }

  /**
   * Convert time string to decimal hours (e.g., "14:30" -> 14.5)
   */
  timeToDecimal(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  }

  /**
   * Convert decimal hours to time string (e.g., 14.5 -> "14:30")
   */
  decimalToTime(decimal) {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Check if time slot is available for specialist AND globally
   */
  isSlotAvailable(specialist, date, startTime, duration) {
    this.initSpecialistDate(specialist, date);
    
    const startDecimal = this.timeToDecimal(startTime);
    const endDecimal = startDecimal + (duration / 60);

    // Check business hours
    if (startDecimal < this.businessHours.start || endDecimal > this.businessHours.end) {
      return false;
    }

    // Check lunch break overlap
    if (
      (startDecimal >= this.lunchBreak.start && startDecimal < this.lunchBreak.end) ||
      (endDecimal > this.lunchBreak.start && endDecimal <= this.lunchBreak.end) ||
      (startDecimal <= this.lunchBreak.start && endDecimal >= this.lunchBreak.end)
    ) {
      return false;
    }

    // Check GLOBAL schedule for ANY overlaps (prevents overlaps across all specialists)
    const globalEvents = this.globalSchedule[date] || [];
    for (const event of globalEvents) {
      const eventStart = this.timeToDecimal(event.start);
      const eventEnd = this.timeToDecimal(event.end);

      if (
        (startDecimal >= eventStart && startDecimal < eventEnd) ||
        (endDecimal > eventStart && endDecimal <= eventEnd) ||
        (startDecimal <= eventStart && endDecimal >= eventEnd)
      ) {
        return false; // Global overlap detected
      }
    }

    // Also check specialist-specific schedule (redundant but safe)
    const existingEvents = this.schedule[specialist][date];
    for (const event of existingEvents) {
      const eventStart = this.timeToDecimal(event.start);
      const eventEnd = this.timeToDecimal(event.end);

      if (
        (startDecimal >= eventStart && startDecimal < eventEnd) ||
        (endDecimal > eventStart && endDecimal <= eventEnd) ||
        (startDecimal <= eventStart && endDecimal >= eventEnd)
      ) {
        return false; // Specialist overlap detected
      }
    }

    return true;
  }

  /**
   * Find next available time slot for specialist
   */
  findNextAvailableSlot(specialist, date, duration, preferredStartTime = null) {
    this.initSpecialistDate(specialist, date);

    const startHour = preferredStartTime 
      ? this.timeToDecimal(preferredStartTime)
      : this.businessHours.start;

    // Try to find slot starting from preferred time, incrementing by 15 minutes
    for (let time = startHour; time < this.businessHours.end; time += 0.25) {
      const timeStr = this.decimalToTime(time);
      if (this.isSlotAvailable(specialist, date, timeStr, duration)) {
        return timeStr;
      }
    }

    return null; // No available slot found
  }

  /**
   * Book a time slot for specialist (and globally)
   */
  bookSlot(specialist, date, startTime, duration, eventTitle) {
    this.initSpecialistDate(specialist, date);
    
    const startDecimal = this.timeToDecimal(startTime);
    const endDecimal = startDecimal + (duration / 60);
    const endTime = this.decimalToTime(endDecimal);

    const eventSlot = {
      start: startTime,
      end: endTime,
      title: eventTitle,
      specialist: specialist
    };

    // Book in specialist schedule
    this.schedule[specialist][date].push(eventSlot);

    // Book in GLOBAL schedule
    this.globalSchedule[date].push(eventSlot);

    // Sort both by start time
    this.schedule[specialist][date].sort((a, b) => 
      this.timeToDecimal(a.start) - this.timeToDecimal(b.start)
    );
    this.globalSchedule[date].sort((a, b) => 
      this.timeToDecimal(a.start) - this.timeToDecimal(b.start)
    );
  }

  /**
   * Check if client already has event on this date
   */
  hasClientEventOnDate(client, date) {
    if (!this.clientDayTracker[client]) {
      this.clientDayTracker[client] = {};
    }
    return this.clientDayTracker[client][date] === true;
  }

  /**
   * Mark client as having event on date
   */
  markClientEventOnDate(client, date) {
    if (!this.clientDayTracker[client]) {
      this.clientDayTracker[client] = {};
    }
    this.clientDayTracker[client][date] = true;
  }

  /**
   * Get schedule summary
   */
  getScheduleSummary() {
    const summary = [];
    
    // Show global schedule by date
    for (const [date, events] of Object.entries(this.globalSchedule)) {
      if (events.length > 0) {
        summary.push(`📅 ${date}: ${events.length} total events`);
        // Show time distribution
        const timeSlots = events.map(e => `${e.start} (${e.specialist})`).join(', ');
        summary.push(`   Times: ${timeSlots}`);
      }
    }
    
    return summary;
  }
}

// Simple CSV parser - handles both tab and comma separated
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  
  // Detect delimiter (tab or comma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  
  console.log(`📊 Detected delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'}`);
  
  // Parse headers
  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  console.log(`📋 Found ${headers.length} columns`);
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const record = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    // Only add if we have a valid client name
    if (record['Client'] && record['Client'].length > 0) {
      records.push(record);
    }
  }
  
  console.log(`✅ Parsed ${records.length} valid records`);
  if (records.length > 0) {
    console.log(`📝 Sample record:`, {
      Client: records[0]['Client'],
      Status: records[0]['Placement Status'],
      Expiry: records[0]['Placement Expiry Date'],
      Specialist: records[0]['Placement Specialist']
    });
  }
  
  return records;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  
  try {
    // Handle both DD-MM-YYYY and DD/MM/YY formats
    let day, month, year;
    
    if (dateStr.includes('-')) {
      [day, month, year] = dateStr.split('-');
    } else if (dateStr.includes('/')) {
      [day, month, year] = dateStr.split('/');
    } else {
      return null;
    }
    
    // Convert 2-digit year to 4-digit
    const fullYear = year.length === 2 ? `20${year}` : year;
    
    // Return ISO format
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error(`Failed to parse date: ${dateStr}`, error);
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
  const today = new Date();
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

/**
 * Generate ONE primary action per record (no duplicates per day)
 */
function getPrimaryAction(record, targetDate) {
  const status = record['Placement Status'];
  const clientName = record['Client'];
  const expiryDate = parseDate(record['Placement Expiry Date']);
  const daysLeft = daysToExpiry(expiryDate);
  
  if (!expiryDate || daysLeft === null) return null;

  // Define action based on status (ONE action only)
  let action = null;

  switch (status) {
    case 'Quote':
      action = {
        title: `📞 Follow-up Call: ${clientName}`,
        description: createDescription(record, 'Follow up on quote provided', [
          'Discuss quote details and coverage',
          'Address any questions or concerns',
          'Confirm client understanding of terms',
          'Set timeline for decision'
        ]),
        duration: 30,
        colorId: '9',
        preferredTime: '10:00'
      };
      break;

    case 'Submitted':
      action = {
        title: `🔍 Check Carrier Response: ${clientName}`,
        description: createDescription(record, 'Follow up with carrier on submission', [
          'Check if carrier has reviewed submission',
          'Request status update',
          'Note any additional requirements',
          'Update internal tracking'
        ]),
        duration: 15,
        colorId: '5',
        preferredTime: '11:00'
      };
      break;

    case 'No Response':
      action = {
        title: `🚨 URGENT: First Follow-up: ${clientName}`,
        description: createDescription(record, 'Immediate outreach required', [
          'Call client directly',
          'Email if no answer',
          'Try alternative contacts',
          'Document attempt'
        ]),
        duration: 20,
        colorId: '11',
        preferredTime: '09:30'
      };
      break;

    case 'Bound':
    case 'Received':
      action = {
        title: `📄 Send Policy Documents: ${clientName}`,
        description: createDescription(record, 'Deliver final policy documents', [
          'Compile all policy documents',
          'Prepare summary of coverage',
          'Email complete package to client',
          'Confirm receipt'
        ]),
        duration: 45,
        colorId: '10',
        preferredTime: '14:00'
      };
      break;

    case 'Declination':
      action = {
        title: `🔄 Explore Alternatives: ${clientName}`,
        description: createDescription(record, 'Explore alternative carriers', [
          'Review declination reason',
          'Identify alternative carriers',
          'Prepare new submission strategy',
          'Contact client with options'
        ]),
        duration: 40,
        colorId: '8',
        preferredTime: '15:00'
      };
      break;
  }

  // Add URGENT expiry alert if within 14 days
  if (daysLeft <= 14 && daysLeft > 0) {
    action = {
      title: `🔔 URGENT EXPIRY: ${clientName} (${daysLeft} days left)`,
      description: createDescription(record, `Policy expires in ${daysLeft} days`, [
        '⚠️ CRITICAL: Verify renewal status immediately',
        'Confirm coverage continuity',
        'Escalate if not finalized',
        'Avoid coverage gap at all costs'
      ]),
      duration: 30,
      colorId: '11',
      preferredTime: '09:00'
    };
  }

  return action ? { ...action, date: targetDate, client: clientName, specialist: record['Placement Specialist'] } : null;
}

async function createCalendarEvent(action) {
  const startDateTime = `${action.date}T${action.time}:00`;
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + action.duration * 60000);

  const eventData = {
    summary: action.title,
    description: action.description,
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    timeZone: 'Asia/Kolkata',
    isAllDay: false,
    reminders: [
      { method: 'popup', minutes: 30 },
      { method: 'email', minutes: 60 }
    ],
    colorId: action.colorId
  };

  return await googleConnector.createCalendarEvent(eventData);
}

/**
 * Main sync function with smart scheduling
 */
async function syncRenewalsToCalendar(csvPath, options = {}) {
  const { dryRun = false, maxRecords = null } = options;
  
  console.log('\n🚀 ========== SMART CALENDAR SYNC STARTED ==========');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '✅ LIVE SYNC'}`);
  console.log(`CSV Path: ${csvPath}\n`);

  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvText);
  
  console.log(`📄 Parsed ${records.length} records from CSV\n`);

  const scheduler = new SmartScheduler();
  const today = new Date().toISOString().split('T')[0];
  
  let processedCount = 0;
  let eventsCreated = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const recordsToProcess = maxRecords ? records.slice(0, maxRecords) : records;

  // Group records by specialist to optimize scheduling
  const recordsBySpecialist = {};
  for (const record of recordsToProcess) {
    const specialist = record['Placement Specialist'] || 'Unassigned';
    if (!recordsBySpecialist[specialist]) {
      recordsBySpecialist[specialist] = [];
    }
    recordsBySpecialist[specialist].push(record);
  }

  console.log(`👥 Found ${Object.keys(recordsBySpecialist).length} specialists\n`);

  // Process each specialist's records
  for (const [specialist, specialistRecords] of Object.entries(recordsBySpecialist)) {
    console.log(`\n📋 Processing ${specialistRecords.length} records for: ${specialist}`);
    
    for (const record of specialistRecords) {
      const clientName = record['Client'];
      const expiryDate = parseDate(record['Placement Expiry Date']);
      const daysLeft = daysToExpiry(expiryDate);

      // Skip if no valid expiry
      if (!expiryDate || daysLeft === null) {
        console.log(`   ⏭️  Skipped ${clientName} - No valid expiry date (raw: ${record['Placement Expiry Date']})`);
        skippedCount++;
        continue;
      }
      
      // Debug: Show what we parsed
      if (processedCount < 3) {
        console.log(`   🔍 Debug ${clientName}:`, {
          rawExpiry: record['Placement Expiry Date'],
          parsedExpiry: expiryDate,
          daysLeft: daysLeft,
          specialist: specialist
        });
      }

      // Determine target date for action (start actions 7 days from today for "Quote", immediate for urgent)
      let targetDate;
      if (record['Placement Status'] === 'No Response' || daysLeft <= 14) {
        targetDate = addDays(today, 1); // Urgent: next day
      } else if (record['Placement Status'] === 'Bound' || record['Placement Status'] === 'Received') {
        targetDate = addDays(today, 1); // Documents: next day
      } else if (record['Placement Status'] === 'Quote') {
        targetDate = addDays(today, 7); // Quote follow-up: 7 days out
      } else if (record['Placement Status'] === 'Submitted') {
        targetDate = addDays(today, 3); // Carrier check: 3 days out
      } else {
        targetDate = addDays(today, 5); // Default: 5 days out
      }

      // Check if client already has event on this date
      if (scheduler.hasClientEventOnDate(clientName, targetDate)) {
        console.log(`   ⏭️  Skipped ${clientName} - Already has event on ${targetDate}`);
        skippedCount++;
        continue;
      }

      // Get primary action for this record
      const action = getPrimaryAction(record, targetDate);
      
      if (!action) {
        skippedCount++;
        continue;
      }

      // Find available time slot
      const availableTime = scheduler.findNextAvailableSlot(
        specialist,
        targetDate,
        action.duration,
        action.preferredTime
      );

      if (!availableTime) {
        console.log(`   ⚠️  No available slot for ${clientName} on ${targetDate}`);
        errorCount++;
        continue;
      }

      // Book the slot
      action.time = availableTime;
      scheduler.bookSlot(specialist, targetDate, availableTime, action.duration, action.title);
      scheduler.markClientEventOnDate(clientName, targetDate);

      console.log(`   ✅ Scheduled: ${clientName} at ${targetDate} ${availableTime}`);

      if (!dryRun) {
        try {
          await createCalendarEvent(action);
          eventsCreated++;
          await new Promise(r => setTimeout(r, 500)); // Rate limiting
        } catch (error) {
          console.error(`   ❌ Failed to create event: ${error.message}`);
          errorCount++;
        }
      }

      processedCount++;
    }
  }

  console.log('\n📊 ========== SCHEDULE SUMMARY ==========');
  scheduler.getScheduleSummary().forEach(line => console.log(`   ${line}`));

  console.log('\n✨ ========== SYNC COMPLETED ==========');
  console.log(`✅ Records Processed: ${processedCount}`);
  console.log(`📅 Events Created: ${eventsCreated}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total Records: ${recordsToProcess.length}\n`);
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const possiblePaths = [
    path.join(__dirname, '../data/renewals.csv'),
    path.join(process.cwd(), 'data/renewals.csv'),
    args[1] || ''
  ].filter(Boolean);

  let csvPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (command === 'help' || !csvPath) {
    console.log(`
📅 SMART RENEWALS TO CALENDAR SYNC

FEATURES:
  ✅ No overlapping events per specialist
  ✅ One action per client per day
  ✅ Smart time allocation (9 AM - 5 PM)
  ✅ Respects lunch breaks (12:30 - 1:30 PM)
  ✅ Urgency-based scheduling

USAGE:
  node scripts/syncRenewalsToCalendar.js [command]

COMMANDS:
  preview      Preview schedule (dry run)
  sync         Create actual calendar events
  test N       Test with first N records
  help         Show this help

EXAMPLES:
  node scripts/syncRenewalsToCalendar.js preview
  node scripts/syncRenewalsToCalendar.js sync
  node scripts/syncRenewalsToCalendar.js test 10

CSV FILE:
  ${csvPath ? `✅ Found: ${csvPath}` : '❌ Not found - create data/renewals.csv'}
    `);
    return;
  }

  switch (command) {
    case 'preview':
      await syncRenewalsToCalendar(csvPath, { dryRun: true });
      break;

    case 'sync':
      console.log('⚠️  This will create REAL calendar events!');
      console.log('Press Ctrl+C in 5 seconds to cancel...\n');
      await new Promise(r => setTimeout(r, 5000));
      await syncRenewalsToCalendar(csvPath, { dryRun: false });
      break;

    case 'test':
      const n = parseInt(args[1]) || 10;
      console.log(`\n🧪 Testing with first ${n} records...\n`);
      await syncRenewalsToCalendar(csvPath, { dryRun: false, maxRecords: n });
      break;

    default:
      console.log('Unknown command. Run with "help" for usage.');
  }
}

// Export the main function for API use
export { syncRenewalsToCalendar, SmartScheduler };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}